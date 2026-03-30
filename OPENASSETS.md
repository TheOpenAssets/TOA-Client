<div align="center">

```
 ________                                  _____                         __
\_____  \ ______   ____   ____           /  _  \   ______ ______  _____/  |_  ______
 /   |   \\____ \_/ __ \ /    \         /  /_\  \ /  ___//  ___/_/ __ \\   __\/  ___/
/    |    \  |_> >  ___/|   |  \       /    |    \\___ \ \___ \ \  ___/|  |  \___ \
\_______  /   __/ \___  >___|  /       \____|__  /____  >____  > \___  >__|  /____  >
        \/|__|        \/     \/                \/     \/     \/      \/          \/
```

### T O K E N I Z E &nbsp;·&nbsp; I N V E S T &nbsp;·&nbsp; T R A D E &nbsp;·&nbsp; B O R R O W &nbsp;·&nbsp; E A R N

**THE UNIFIED RWA EXECUTION LAYER — POWERED BY CREDITCOIN**

[![Live App](https://img.shields.io/badge/LIVE_APP-openassets.xyz-black?style=for-the-badge)](https://www.openassets.xyz)

[![Network](https://img.shields.io/badge/Network-Creditcoin_Testnet_102031-6366f1?style=for-the-badge)](https://creditcoin-testnet.blockscout.com)

</div>



## The Vision

> **OpenAssets transforms idle real-world assets into living financial infrastructure — where every invoice, deed, and trade instrument can be tokenized, traded, borrowed against, and composed across protocols, all anchored to a credit identity that follows you forever on Creditcoin.**

---

## The Problem — Three Fractures Killing RWA Finance

### 🔒 Fracture 1 — Assets Die After Acquisition
Tokenized RWAs sit inert in wallets until maturity. No composability. No reuse. No leverage. A billion-dollar invoice just... waits. DeFi promised programmable money — RWAs delivered digital paper.

### 🌐 Fracture 2 — Markets are Walled Gardens
RWA issuance happens in silos. Fragmented venues. Opaque pricing. Illiquid secondaries. Issuers can't find buyers. Buyers can't exit. Liquidity doesn't flow — it pools and stagnates.

### 🧠 Fracture 3 — Your Credit History is Invisible
A borrower who has reliably repaid $200,000 across three protocols walks into a new platform and gets treated like a ghost. Every lender starts from zero. The financial identity that should travel with you — doesn't exist anywhere on-chain.

---

## The Solution — OpenAssets on Creditcoin

OpenAssets is not another RWA marketplace. It is the **full execution layer** — from the moment an asset is issued to the moment yield is distributed — with a credit identity system underneath that makes every interaction smarter, fairer, and composable across the entire DeFi ecosystem.

---

## Why Creditcoin — The Only Chain Built for This

Every other blockchain treats credit as a dApp problem. Creditcoin treats it as a **protocol primitive**.

| What Creditcoin Does | Why It Matters |
|---|---|
| Stores loan primitives natively at the chain level | Repayments are chain facts — not database entries |
| **4.27M real credit transactions** recorded on-chain | The deepest real-world credit dataset in crypto |
| **$80M+ in verified loan value** across **337,000+ borrowers** | Real data. Not simulated. Not synthetic. |
| Hybrid Substrate + EVM architecture | Credit history on Substrate. Smart contracts on EVM. Best of both. |
| USC `0x0FD2` precompile for STARK proof verification | Cross-chain loan events verified mathematically, in the same tx |

Creditcoin is not a chain that *can* do credit. It is the chain that *is* credit. OpenAssets is the application layer built to unlock it.

---

## Platform Architecture — Six Interlocked Engines

### ① Canonical RWA Tokenization
Off-chain financial instruments — invoices, trade receivables, property deeds — become compliant ERC-20 tokens with deterministic lifecycles. Every asset is attested, KYC-gated, and fully auditable from issuance through settlement.

### ② Hybrid Market Discovery
Two distribution mechanisms run natively on Creditcoin EVM:
- **Static Listings** — fixed-price, instant liquidity for predictable assets
- **Uniform-Price Auctions** — fair price discovery where all winners pay the same clearing price

### ③ Secondary Market — Exit Anytime
P2P order book for RWA tokens. Post bids and asks directly against other holders. Continuous price discovery. On-demand exit liquidity for assets that would otherwise be locked until maturity.

### ④ OAID — Universal Credit Identity
Deposit RWA tokens as collateral into the SolvencyVault. Receive an **OAID** — a portable credit line that works across every protocol integrated with Creditcoin. One deposit. Infinite reach.

### ⑤ Two-Layer Credit Score — The Creditcoin Advantage
Your borrowing terms are not arbitrary. They are computed from verifiable financial history:

| Layer | Source | Weight |
|---|---|---|
| **Layer 1** | Platform repayment behavior on OpenAssets | 60% |
| **Layer 2** | Creditcoin Substrate protocol score — 4.27M real tx | 40% |

| Tier | Score | Applied LTV |
|---|---|---|
| EXCELLENT | 800+ | **75%** |
| GOOD | 600–799 | **70%** |
| FAIR | 400–599 | **65%** |
| POOR | < 400 | **55%** |

Two users depositing identical collateral receive different borrowing terms — based on real, on-chain, verified financial behavior.

### ⑥ USC — Trustless Cross-Chain Credit Settlement
Repay a loan on Aave (Ethereum). OpenAssets knows about it on Creditcoin — **without a bridge, without an oracle company, without trust**.

The `0x0FD2` precompile baked into Creditcoin EVM verifies STARK proofs of external chain transactions synchronously. The proof *is* the report.

```
External Chain (Ethereum/BSC/BTC)
        ↓
  Attestors fingerprint entire tx history
        ↓
  Provers generate STARK proof of your specific tx
        ↓
  0x0FD2 precompile verifies proof on Creditcoin EVM
        ↓
  Credit score updated. Same transaction. No waiting.
```

---

## Deployed Smart Contracts — Creditcoin Testnet (Chain ID: 102031)

| Contract | Purpose | Address |
|---|---|---|
| **Mock USDC** | Settlement & borrowing asset | [`0x32223cA0BDDb1c1fD68f21de3FF64C147F2B2fC1`](https://creditcoin-testnet.blockscout.com/address/0x32223cA0BDDb1c1fD68f21de3FF64C147F2B2fC1) |
| **Primary Marketplace** | Fixed-price listings + auctions | [`0x2E310C62A225033055E88B690F8d054ece8bcbC4`](https://creditcoin-testnet.blockscout.com/address/0x2E310C62A225033055E88B690F8d054ece8bcbC4) |
| **Secondary Market** | P2P RWA token order book | [`0xb9BfaEDe01f0f2b2162072b73e2b2038Fb42b5cD`](https://creditcoin-testnet.blockscout.com/address/0xb9BfaEDe01f0f2b2162072b73e2b2038Fb42b5cD) |
| **Yield Vault** | Time-weighted yield distribution | [`0x03FE7d3736402D140659e7bD92B64808E31C3f51`](https://creditcoin-testnet.blockscout.com/address/0x03FE7d3736402D140659e7bD92B64808E31C3f51) |
| **Token Factory** | RWA ERC-20 deployment | [`0xf63B563b6D438122cBC87f4356e60b8BB3Bc53E2`](https://creditcoin-testnet.blockscout.com/address/0xf63B563b6D438122cBC87f4356e60b8BB3Bc53E2) |
| **Attestation Registry** | Asset compliance attestation | [`0x5D18b955FceE3e5a5c6CCF2F321cD28E76910662`](https://creditcoin-testnet.blockscout.com/address/0x5D18b955FceE3e5a5c6CCF2F321cD28E76910662) |
| **Trusted Issuers Registry** | Issuer KYC & authorization | [`0xde336BA92db0a667F3EF1DCc2A093B4b7B1629dA`](https://creditcoin-testnet.blockscout.com/address/0xde336BA92db0a667F3EF1DCc2A093B4b7B1629dA) |
| **Identity Registry** | Investor KYC & OAID identity | [`0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238`](https://creditcoin-testnet.blockscout.com/address/0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238) |
| **Senior Pool** | Platform USDC liquidity pool | [`0xA5D08Fb40041CD0a349dcbEF31f9F50FBdE215F1`](https://creditcoin-testnet.blockscout.com/address/0xA5D08Fb40041CD0a349dcbEF31f9F50FBdE215F1) |
| **Solvency Vault** | RWA collateral & OAID credit lines | [`0x77bB1944E2a2FC0e5D0F587699041ee09900ADA8`](https://creditcoin-testnet.blockscout.com/address/0x77bB1944E2a2FC0e5D0F587699041ee09900ADA8) |
| **OAID** | Universal credit identity | [`0x89C70bB202341c28e7a8dF333b4981BfB49b3c21`](https://creditcoin-testnet.blockscout.com/address/0x89C70bB202341c28e7a8dF333b4981BfB49b3c21) |
| **USC Credit Verifier** | Cross-chain STARK proof verifier | [`0x4898723528Fe25756c2e1968605a62ce6c48F576`](https://creditcoin-testnet.blockscout.com/address/0x4898723528Fe25756c2e1968605a62ce6c48F576) |
| **USC Precompile** | STARK proof verifier (built-in) | `0x0FD2` |

> All contracts deployed and verified on **Creditcoin Testnet — Chain ID 102031**
> Explorer: [creditcoin-testnet.blockscout.com](https://creditcoin-testnet.blockscout.com)

---

## Network Details

| Property | Value |
|---|---|
| Network | Creditcoin Testnet |
| Chain ID | `102031` |
| EVM RPC | `https://rpc.cc3-testnet.creditcoin.network` |
| Substrate WS | `wss://rpc.cc3-testnet.creditcoin.network` |
| Block Explorer | `https://creditcoin-testnet.blockscout.com` |
| USC Precompile | `0x0FD2` |

---

## Full System Flow

```
ISSUANCE → DISCOVERY → ACQUISITION → COLLATERAL DEPOSIT
    → OAID CREDIT → BORROW → CROSS-CHAIN VERIFICATION
        → REPAYMENT → SETTLEMENT → YIELD DISTRIBUTION
```

Every step. One platform. One credit identity. One chain purpose-built to record it all.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React · TypeScript · Vite · TailwindCSS · Wagmi · Viem |
| Backend | NestJS · MongoDB · BullMQ · Redis |
| Smart Contracts | Solidity · Creditcoin EVM (chainId 102031) |
| Credit Layer | Creditcoin Substrate via `@polkadot/api` WebSocket RPC |
| Cross-Chain | USC STARK proofs · `0x0FD2` precompile |

---

## Core Principles

```
Trustless  ·  Credit-Aware  ·  Cross-Chain  ·  Transparent  ·  Composable  ·  Fair
```

---

## The Endgame

> Any borrower. Any chain. Any protocol.
> One credit identity — built from real financial history, anchored on Creditcoin, portable everywhere.
>
> **OpenAssets is the foundational infrastructure for that world.**

---

<div align="center">

[openassets.xyz](https://www.openassets.xyz) &nbsp;·&nbsp; [Creditcoin Explorer](https://creditcoin-testnet.blockscout.com) &nbsp;·&nbsp; [YouTube Demo](https://youtu.be/aWP3_nrwm84)

© 2026 OpenAssets — All rights reserved.

</div>
