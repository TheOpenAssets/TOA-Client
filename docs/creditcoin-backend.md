# Creditcoin Credit System — Backend Build Doc

Hackathon scope. Everything works on-chain (Creditcoin testnet, chainId 102031). No production overhead.

---

## Dependencies to Install

```
@polkadot/api
@polkadot/util-crypto
```

These go into `packages/backend/package.json`. Needed for Substrate RPC connection and EVM → SS58 address conversion.

---

## Gap 2 — Protocol Score (Substrate Fetcher)

### New file: `packages/backend/src/modules/blockchain/services/creditcoin-substrate.service.ts`

Injectable NestJS service. Three responsibilities:

- `mapEvmToSubstrate(evmAddress)` — converts EVM hex address to Substrate SS58 format using `@polkadot/util-crypto`. Required because Creditcoin's Substrate layer uses SS58, not EVM addresses.
- `fetchCreditHistory(ss58Address)` — opens a WS connection to `wss://rpc.cc3-testnet.creditcoin.network` using `@polkadot/api` ApiPromise and queries the `creditcoin.deals` and `creditcoin.repayments` storage maps for the given address. Returns raw counts and amounts.
- `getProtocolScore(evmAddress)` — calls the above two, runs the scoring formula (completed deals × 80) + (total repaid weight) − (defaults × 200), clamps to 0–1000, caches result in memory map with 10-minute TTL. Caching is mandatory — Substrate RPC queries are slow.

Register this service in `packages/backend/src/modules/blockchain/blockchain.module.ts` as a provider and export it. No new module needed, it lives in blockchain.

---

## Gap 3 — Composite Score Engine

### New module: `packages/backend/src/modules/credit-score/`

#### `credit-score.module.ts`
Standard NestJS module. Imports `BlockchainModule` (for SubstrateService), `MongooseModule` with `SolvencyPosition` and `LeveragePosition` schemas (to read platform history). Exports `CreditScoreService`.

#### `credit-score.service.ts`

- `getLayer1Score(walletAddress)` — reads `SolvencyPosition` collection from DB for this wallet. Computes: `(onTimeInstallments / totalInstallments) × 600` + `(totalRepaid weight) × 200` − `(missedPayments × 50)` − `(isDefaulted ? 300 : 0)`. Returns 0–1000. New users with no positions return 500 (neutral baseline).
- `getCompositeScore(walletAddress)` — calls `getLayer1Score` and `CreditcoinSubstrateService.getProtocolScore`. Combines as `(layer1 × 0.6) + (layer2 × 0.4)`. If layer2 is unavailable (wallet has no Substrate history), falls back to 100% layer1.
- `getEffectiveLTV(walletAddress)` — calls `getCompositeScore`, maps to LTV tier: 800+ → 7500 bps, 600–799 → 7000 bps (current default), 400–599 → 6500 bps, below 400 → 5500 bps. Returns the basis-point number.
- `getBorrowTerms(walletAddress)` — returns full object: `{ compositeScore, layer1Score, layer2Score, tier, effectiveLTV, maxBorrowMultiplier }`. This is what the frontend displays before the user borrows.

#### `credit-score.controller.ts`

- `GET /credit-score/:walletAddress` — returns full composite breakdown. Swagger documented.
- `GET /solvency/borrow-terms/:walletAddress` — returns `getBorrowTerms()` result. The pre-borrow preview endpoint.

#### `context.md`
Must be created. Explains this module owns score computation only — it reads data, never writes it.

### Modify: `packages/backend/src/app.module.ts`
Import and register `CreditScoreModule`. It needs to be globally accessible because Gap 5 uses it from the solvency module.

---

## Gap 4 — USC Cross-Chain Proof Processor

### New Solidity contract: `packages/creditcoin-contracts/src/contracts/integrations/USCCreditVerifier.sol`

Thin contract — no storage. One function receives `(address wallet, uint8 eventType, int256 scoreDelta, bytes calldata proof)`, calls the `0x0FD2` precompile with the proof bytes, and on success emits `CrossChainEventVerified(address wallet, string sourceChain, uint8 eventType, int256 scoreDelta)`. Reverts if precompile returns false. Deploy this to Creditcoin testnet and add address to `packages/creditcoin-contracts/deployed_contracts_creditcoin.json`.

Add `USCCreditVerifier` ABI to `packages/creditcoin-contracts/src/abis/index.ts` — same pattern as existing entries. One line addition.

### New module: `packages/backend/src/modules/usc/`

#### `usc.module.ts`
Imports `BlockchainModule`, `BullModule` (queue registration for `usc-events`), `CreditScoreModule`. Registers controller, service, processor.

#### `submit-proof.dto.ts`
Fields: `walletAddress`, `sourceChain` (enum: ETHEREUM, BSC, BITCOIN), `eventType` (enum: REPAYMENT, DEFAULT, STAKE), `scoreDelta` (number), `proofData` (hex string). Class-validator decorated.

#### `usc-proof.service.ts`
- `submitProof(dto)` — builds and submits a transaction calling `USCCreditVerifier.verifyAndRecord()` on Creditcoin testnet using the existing `WalletService` + `ContractLoaderService` pattern already established in the codebase. Returns `{ txHash, verified: true/false }`.

#### `usc-event.processor.ts`
BullMQ processor on the `usc-events` queue. Receives a decoded `CrossChainEventVerified` event. Calls `CreditScoreService` to invalidate the cache for that wallet so the next score fetch is fresh. Optionally fires a notification via `NotificationService` — "Your Ethereum repayment was verified on Creditcoin. Credit score updated."

#### `usc.controller.ts`
- `POST /usc/submit-proof` — JWT guarded, calls `usc-proof.service.ts`. Swagger documented with full request/response schema.
- `GET /usc/events/:walletAddress` — returns list of verified cross-chain events for this wallet from DB (simple log, not a new schema — just a lightweight in-memory or single-collection log).

### Modify: `packages/backend/src/modules/truth-engine/services/`
Add `USCCreditVerifier` to the event polling list. When `CrossChainEventVerified` fires, enqueue to `usc-events` BullMQ queue. Same pattern as every other contract event listener in the truth-engine. Two additions: add the contract to the polling registry, add the event handler.

---

## Gap 5 — Credit-Aware Borrowing Terms

### Modify: `packages/backend/src/modules/solvency/services/solvency-blockchain.service.ts`

`depositCollateral()` and `borrowUSDC()` currently use hardcoded LTV values sourced from constants. Change the signature to accept an optional `ltv?: number` parameter. If provided, use it. If not, fall back to the existing constant. This is a one-line change in each method — the reason is that the controller will now pass a credit-adjusted LTV from above.

### Modify: `packages/backend/src/modules/solvency/controllers/solvency.controller.ts`

In the borrow handler, before calling `SolvencyBlockchainService.borrowUSDC()`, inject `CreditScoreService` and call `getEffectiveLTV(walletAddress)`. Pass the returned LTV to the blockchain call. Append `creditBoost: { score, tier, appliedLTV }` to the response object so the frontend can display it. The reason: hardcoded LTV ignores the user's credit identity entirely.

### Modify: `packages/backend/src/modules/partners/services/partner-loan.service.ts`

In the `borrow()` method, after validating OAID credit line availability, call `CreditScoreService.getEffectiveLTV(userWallet)`. Use this LTV to recalculate the effective `availableCredit` ceiling before the borrow executes. Users with higher scores get proportionally more headroom. One-paragraph addition to the existing validation chain.

### Modify: `packages/backend/src/modules/solvency/solvency.module.ts`

Import `CreditScoreModule` here. Required because `SolvencyController` now depends on `CreditScoreService`. Without this the DI container fails.

---

## Context files that must be created/updated

| File | Action |
|---|---|
| `modules/credit-score/context.md` | Create — owns score computation, reads-only |
| `modules/usc/context.md` | Create — owns proof submission and cross-chain event handling |
| `modules/blockchain/context.md` | Update — add CreditcoinSubstrateService as new export |
| `modules/solvency/context.md` | Update — note that borrow now accepts credit-adjusted LTV |
| `modules/partners/context.md` | Update — note credit score check in borrow validation chain |

---

## Deployment Checklist (Creditcoin Testnet)

1. Deploy `USCCreditVerifier.sol` to chainId 102031
2. Add address to `deployed_contracts_creditcoin.json`
3. Add ABI to `creditcoin-contracts/src/abis/index.ts`
4. Confirm `NETWORK_TYPE=creditcoin` env var routes blockchain adapter to correct RPC and contract addresses
