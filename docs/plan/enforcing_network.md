# Feature Registry — Frontend Domain Strategy Architecture Plan

**Status:** Proposed
**Context:** The backend resolved multi-network complexity with a Module Registry / Domain Strategy pattern. The frontend faces the same problem: pages directly use wagmi hooks and EVM contract services that crash on Stellar. The auth layer was already abstracted (`AuthStrategyContext` + `EvmAuthProvider` / `StellarAuthProvider`). This plan extends that proven pattern to every feature domain.

---

## The Gap

**What exists (Level 1):** Network routing (`/:network/*`), wallet provider branching (`NetworkLayout`), auth strategy abstraction, dynamic API URL resolution, boolean feature flags (`leverage: true/false`).

**What's missing (Level 2):** Domain strategy layer. Pages call `useAccount()` from wagmi directly (crashes on Stellar), import `contractService` (ethers.js + `window.ethereum`, hardcoded chainId 5003n), and have 50+ hardcoded `navigate('/path')` calls missing `networkPath()`. The boolean flags say "is this feature on?" but not "HOW does this feature work on this network?" — e.g., marketplace supports direct buy + auction + leverage on Mantle but only direct buy on Stellar.

---

## Architecture

Every feature domain follows the same three-layer pattern already proven by auth:

```
Strategy Interface  (TypeScript interface + React Context + useXxxStrategy() hook)
        ↓
Network Providers   (EvmXxxProvider / StellarXxxProvider — contain all network-specific code)
        ↓
NetworkLayout       (mounts the correct provider tree based on networkType)
```

Pages never import network-specific code. They call `useWalletStrategy()`, `useMarketplaceStrategy()`, etc.

---

## 1. Expanded Capabilities Config

Replace flat booleans with structured capability descriptors.

**New file: `src/lib/network/network-capabilities.ts`**

```ts
export interface MarketplaceCapabilities {
  directBuy: boolean;
  auction: boolean;
  leverageBuy: boolean;
}

export interface SecondaryMarketCapabilities {
  enabled: boolean;
  orderCreation: boolean;
  orderCancellation: boolean;
}

export interface YieldCapabilities {
  enabled: boolean;
  burnToClaim: boolean;  // EVM: burn RWA tokens to claim. Stellar: different flow
}

export interface SolvencyCapabilities {
  enabled: boolean;
  depositCollateral: boolean;
  borrowUSDC: boolean;
  repayLoan: boolean;
}

export interface WalletCapabilities {
  type: 'evm' | 'stellar';
  integrityMonitoring: boolean;
  nativeTokenSymbol: string;
  explorerBaseUrl: string;
  networkDisplayName: string;  // "Mantle Network" / "Stellar Network" — replaces hardcoded UI text
}

export interface NetworkCapabilities {
  marketplace: MarketplaceCapabilities;
  secondaryMarket: SecondaryMarketCapabilities;
  yield: YieldCapabilities;
  solvency: SolvencyCapabilities;
  wallet: WalletCapabilities;
  faucet: boolean;
  kycOnChain: boolean;
}
```

Mantle: `{ marketplace: { directBuy: true, auction: true, leverageBuy: true }, ... }`
Stellar: `{ marketplace: { directBuy: true, auction: false, leverageBuy: false }, ... }`

**Modify: `src/lib/network/network.config.ts`** — add `capabilities: NetworkCapabilities` to `NetworkConfig`.
**Modify: `src/lib/network/NetworkContext.tsx`** — add `isCapabilityAvailable(path: string)` for dot-path queries like `'marketplace.auction'`, expose `capabilities` object.

The old `features` field stays temporarily for backward compat, removed in Phase 5.

---

## 2. Strategy Domains (6 total)

### Domain 1: WalletStrategy (foundation — everything depends on this)

**Interface:**
```ts
interface WalletStrategy {
  address: string | undefined;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
  explorerUrl: (txHash: string) => string;
  walletType: 'evm' | 'stellar';
}
```

**Files:**
- `src/lib/strategies/wallet/WalletStrategyContext.tsx` — interface + context + `useWalletStrategy()` hook
- `src/lib/strategies/wallet/EvmWalletProvider.tsx` — wraps wagmi `useAccount`, `useDisconnect`, `useSignMessage`, RainbowKit `useConnectModal`
- `src/lib/strategies/wallet/StellarWalletProvider.tsx` — wraps Freighter `getAddress`, `isConnected`, `signMessage`, `requestAccess`

Replaces ALL direct `useAccount()` / `useDisconnect()` usage across the codebase.

### Domain 2: MarketplaceStrategy (deepest divergence)

**Interface:**
```ts
interface MarketplaceStrategy {
  completePurchase: (params: PurchaseParams) => Promise<PurchaseResult>;
  verifyListing: (assetId: string, tokenAddress?: string) => Promise<VerifyResult>;
  getPaymentTokenBalance: (userAddress: string) => Promise<string>;
  capabilities: MarketplaceCapabilities;
}
```

**Files:**
- `src/lib/strategies/marketplace/MarketplaceStrategyContext.tsx`
- `src/lib/strategies/marketplace/EvmMarketplaceProvider.tsx` — wraps `contractService.completePurchase()`, `checkUSDCBalance()`
- `src/lib/strategies/marketplace/StellarMarketplaceProvider.tsx` — Stellar/Soroban purchase flow

### Domain 3: AuctionStrategy

**Interface:**
```ts
interface AuctionStrategy {
  submitBid: (params: BidSubmissionParams) => Promise<{ success: boolean }>;
  settleBid: (params: BidSettlementParams) => Promise<void>;
  checkKYC: () => { isVerified: boolean; isLoading: boolean };
  endAuction: (params: EndAuctionParams) => Promise<void>;
  status: string;
  error: string | null;
  isLoading: boolean;
  reset: () => void;
}
```

**Files:**
- `src/lib/strategies/auction/AuctionStrategyContext.tsx`
- `src/lib/strategies/auction/EvmAuctionProvider.tsx` — wraps `useSubmitBid`, `useSettleBid`, `useEndAuction`, `useCheckKYC` from `useAuctionContracts.ts`
- `src/lib/strategies/auction/NullAuctionProvider.tsx` — returns no-ops for networks without auction support (Stellar). Pages use `capabilities.auction` to hide auction UI entirely.

### Domain 4: SecondaryMarketStrategy

**Interface:**
```ts
interface SecondaryMarketStrategy {
  executeOrder: (txData: any) => Promise<{ txHash: string }>;
  cancelOrder: (orderId: string) => Promise<void>;
  approveToken: (tokenAddress: string, spender: string, amount: string) => Promise<string>;
  checkAllowance: (tokenAddress: string, owner: string, spender: string) => Promise<string>;
  checkBalance: (tokenAddress: string, owner: string) => Promise<string>;
  status: string;
  error: string | null;
  isLoading: boolean;
}
```

**Files:**
- `src/lib/strategies/secondary-market/SecondaryMarketStrategyContext.tsx`
- `src/lib/strategies/secondary-market/EvmSecondaryMarketProvider.tsx` — wraps wagmi `useWriteContract` + `useReadContract` for approve/execute/cancel
- `src/lib/strategies/secondary-market/StellarSecondaryMarketProvider.tsx` — submits XDR transactions via Freighter

### Domain 5: YieldStrategy

**Interface:**
```ts
interface YieldStrategy {
  getSettlementInfo: (tokenAddress: string, userAddress: string) => Promise<SettlementInfo>;
  approveYieldVault: (tokenAddress: string, amount: string) => Promise<TransactionResult>;
  claimYield: (tokenAddress: string, amount: string) => Promise<ClaimResult>;
  getRWATokenBalance: (tokenAddress: string, userAddress: string) => Promise<string>;
}
```

**Files:**
- `src/lib/strategies/yield/YieldStrategyContext.tsx`
- `src/lib/strategies/yield/EvmYieldProvider.tsx` — wraps `contractService.getSettlementInfo()`, `.approveYieldVault()`, `.claimYield()`
- `src/lib/strategies/yield/StellarYieldProvider.tsx` — Stellar native payment operations

### Domain 6: SolvencyStrategy

**Interface:**
```ts
interface SolvencyStrategy {
  depositCollateral: (params) => Promise<TransactionResult>;
  borrowUSDC: (positionId, amount, duration, installments) => Promise<TransactionResult>;
  repayLoan: (positionId, amount) => Promise<TransactionResult>;
  getPosition: (positionId) => Promise<Position>;
  getOutstandingDebt: (positionId) => Promise<bigint>;
  approveToken: (tokenAddress, amount) => Promise<TransactionResult>;
  approveUSDC: (amount) => Promise<TransactionResult>;
}
```

**Files:**
- `src/lib/strategies/solvency/SolvencyStrategyContext.tsx`
- `src/lib/strategies/solvency/EvmSolvencyProvider.tsx` — wraps `solvencyContractService`
- `src/lib/strategies/solvency/StellarSolvencyProvider.tsx` — Soroban contract calls

---

## 3. Provider Nesting in NetworkLayout

Use a `composeProviders` utility (`src/lib/utils/composeProviders.tsx`) to avoid 10-level deep JSX nesting:

```tsx
// src/app/layouts/NetworkLayout.tsx
const MantleProviders = composeProviders(
  WalletProvider, EvmWalletStrategyProvider, WalletIntegrityProvider,
  EvmAuthProvider, EvmMarketplaceProvider, EvmAuctionProvider,
  EvmSecondaryMarketProvider, EvmYieldProvider, EvmSolvencyProvider
);

const StellarProviders = composeProviders(
  StellarWalletProvider, StellarWalletStrategyProvider,
  StellarAuthProvider, StellarMarketplaceProvider, NullAuctionProvider,
  StellarSecondaryMarketProvider, StellarYieldProvider, StellarSolvencyProvider
);

export const NetworkLayout = () => {
  const { networkType } = useNetwork();
  const Providers = networkType === 'stellar' ? StellarProviders : MantleProviders;
  return <Providers><Outlet /></Providers>;
};
```

---

## 4. How Pages Change (examples)

**Marketplace.page.tsx:**
```diff
- import { useAccount, useDisconnect } from 'wagmi';
+ import { useWalletStrategy } from '@/lib/strategies/wallet/WalletStrategyContext';
+ import { useNetwork } from '@/lib/network/NetworkContext';

- const { address } = useAccount();
- const { disconnect } = useDisconnect();
+ const { address, disconnect } = useWalletStrategy();
+ const { networkPath } = useNetwork();

- navigate('/marketplace/asset/' + id);
+ navigate(networkPath('/marketplace/asset/' + id));
```

**AssetDetails.page.tsx:**
```diff
- import { contractService } from '@/lib/api/contract.service';
+ import { useMarketplaceStrategy } from '@/lib/strategies/marketplace/MarketplaceStrategyContext';

- const result = await contractService.completePurchase(params, tokenAddress);
+ const result = await completePurchase(params);
```

**Portfolio.page.tsx** (biggest consumer — uses 4 strategies):
```diff
- import { useAccount, useDisconnect } from 'wagmi';
- import { useSettleBid } from '@/hooks/useAuctionContracts';
- import { useCancelOrder } from '@/hooks/useSecondaryMarket';
- import { contractService } from '@/lib/api/contract.service';
+ import { useWalletStrategy } from '@/lib/strategies/wallet/WalletStrategyContext';
+ import { useAuctionStrategy } from '@/lib/strategies/auction/AuctionStrategyContext';
+ import { useSecondaryMarketStrategy } from '@/lib/strategies/secondary-market/SecondaryMarketStrategyContext';
+ import { useYieldStrategy } from '@/lib/strategies/yield/YieldStrategyContext';
```

---

## 5. Migration Phases

### Phase 0 — Foundation (no page changes)
- Create `src/lib/network/network-capabilities.ts`
- Create `src/lib/utils/composeProviders.tsx`
- Create `src/components/common/FeatureGate.tsx`
- Add `capabilities` to `NetworkConfig` and `NetworkContext`

### Phase 1 — WalletStrategy
- Create wallet strategy context + EVM + Stellar providers
- Mount in `NetworkLayout.tsx`
- Migrate all direct `useAccount`/`useDisconnect` consumers:
  - `Navbar.tsx`, `Marketplace.page.tsx`, `Faucet.page.tsx`, `TradingEngine.page.tsx`, `Portfolio.page.tsx`, `ConnectWallet.tsx`, `TokenFaucetCard.tsx`
- Fix all hardcoded `navigate('/path')` → `navigate(networkPath('/path'))` across these files

### Phase 2 — MarketplaceStrategy + YieldStrategy
- Create marketplace + yield strategy contexts and providers
- Migrate `AssetDetails.page.tsx` (purchase flow → `useMarketplaceStrategy`)
- Migrate `Portfolio.page.tsx` yield claim flow → `useYieldStrategy`
- `contractService` stays as-is, only imported by EVM providers

### Phase 3 — AuctionStrategy + SecondaryMarketStrategy
- Create auction + secondary market strategy contexts and providers
- Migrate `AuctionDetails.page.tsx` → `useAuctionStrategy`
- Migrate `TradingEngine.page.tsx` → `useSecondaryMarketStrategy`
- Migrate `Portfolio.page.tsx` settle bid + cancel order
- Add `FeatureGate` around auction routes

### Phase 4 — SolvencyStrategy
- Create solvency strategy context and providers
- Migrate `BorrowPage.tsx`, `DepositCollateralModal.tsx`, `DirectBorrowModal.tsx`
- Migrate `Portfolio.page.tsx` loans tab + `RepayLoanModal.tsx`

### Phase 5 — Cleanup
- Remove deprecated `features` boolean field from `NetworkConfig`
- Replace all `isFeatureAvailable()` calls with `isCapabilityAvailable()`
- Replace hardcoded "Mantle Network" / "ERC-3643" UI text with `capabilities.wallet.networkDisplayName`
- Replace hardcoded explorer URLs with `capabilities.wallet.explorerBaseUrl`

---

## 6. Files Summary

### New Files (21)

| File | Purpose |
|------|---------|
| `src/lib/network/network-capabilities.ts` | Capability types + per-network configs |
| `src/lib/utils/composeProviders.tsx` | Provider composition utility |
| `src/components/common/FeatureGate.tsx` | Conditional render by capability path |
| `src/lib/strategies/wallet/WalletStrategyContext.tsx` | Interface + context + hook |
| `src/lib/strategies/wallet/EvmWalletProvider.tsx` | wagmi wrapper |
| `src/lib/strategies/wallet/StellarWalletProvider.tsx` | Freighter wrapper |
| `src/lib/strategies/marketplace/MarketplaceStrategyContext.tsx` | Interface + context + hook |
| `src/lib/strategies/marketplace/EvmMarketplaceProvider.tsx` | Wraps contractService |
| `src/lib/strategies/marketplace/StellarMarketplaceProvider.tsx` | Stellar purchase flow |
| `src/lib/strategies/auction/AuctionStrategyContext.tsx` | Interface + context + hook |
| `src/lib/strategies/auction/EvmAuctionProvider.tsx` | Wraps useAuctionContracts |
| `src/lib/strategies/auction/NullAuctionProvider.tsx` | No-op for non-auction networks |
| `src/lib/strategies/secondary-market/SecondaryMarketStrategyContext.tsx` | Interface + context + hook |
| `src/lib/strategies/secondary-market/EvmSecondaryMarketProvider.tsx` | wagmi tx execution |
| `src/lib/strategies/secondary-market/StellarSecondaryMarketProvider.tsx` | XDR via Freighter |
| `src/lib/strategies/yield/YieldStrategyContext.tsx` | Interface + context + hook |
| `src/lib/strategies/yield/EvmYieldProvider.tsx` | Wraps contractService yield methods |
| `src/lib/strategies/yield/StellarYieldProvider.tsx` | Stellar yield claim |
| `src/lib/strategies/solvency/SolvencyStrategyContext.tsx` | Interface + context + hook |
| `src/lib/strategies/solvency/EvmSolvencyProvider.tsx` | Wraps solvencyContractService |
| `src/lib/strategies/solvency/StellarSolvencyProvider.tsx` | Soroban contract calls |

### Files to Modify (~20)

| File | Change |
|------|--------|
| `src/lib/network/network.config.ts` | Add `capabilities` field |
| `src/lib/network/NetworkContext.tsx` | Add `isCapabilityAvailable()`, expose `capabilities` |
| `src/app/layouts/NetworkLayout.tsx` | Mount all strategy providers via `composeProviders` |
| `src/components/common/Navbar.tsx` | `useWalletStrategy()` replaces wagmi |
| `src/components/wallet/ConnectWallet.tsx` | `useWalletStrategy()` replaces wagmi |
| `src/components/faucet/TokenFaucetCard.tsx` | `useWalletStrategy()` replaces wagmi |
| `src/components/portfolio/RepayLoanModal.tsx` | `useSolvencyStrategy()` replaces direct service |
| `src/pages/marketplace/Marketplace.page.tsx` | `useWalletStrategy()` + `networkPath()` |
| `src/pages/marketplace/asset/AssetDetails.page.tsx` | `useMarketplaceStrategy()` for purchase |
| `src/pages/marketplace/auction/AuctionDetails.page.tsx` | `useAuctionStrategy()` + FeatureGate |
| `src/pages/secondary-marketplace/TradingEngine.page.tsx` | `useSecondaryMarketStrategy()` + `useWalletStrategy()` |
| `src/pages/portfolio/Portfolio.page.tsx` | All 4 strategies replace direct imports |
| `src/pages/faucet/Faucet.page.tsx` | `useWalletStrategy()` replaces wagmi |
| `src/pages/borrow/*.tsx` | `useSolvencyStrategy()` replaces direct service |
| `src/pages/admin/operations/OperationsView.page.tsx` | Network-conditional UI text |

### Files That Stay Unchanged (encapsulated inside EVM providers)

- `src/lib/api/contract.service.ts` — only imported by `EvmMarketplaceProvider` + `EvmYieldProvider`
- `src/lib/api/solvency-contract.service.ts` — only imported by `EvmSolvencyProvider`
- `src/hooks/useAuctionContracts.ts` — only imported by `EvmAuctionProvider`
- `src/hooks/useSecondaryMarket.ts` — only imported by `EvmSecondaryMarketProvider`
- `src/lib/blockchain/*.ts` — EVM-only infrastructure, stays as-is

---

## 7. Verification

1. **Mantle routes unchanged**: All existing `/mantle/*` flows work identically — purchase, auction, yield claim, borrow, faucet
2. **Stellar routes don't crash**: `/stellar/marketplace` renders without wagmi errors, shows only direct buy listings
3. **Feature gating works**: `/stellar/marketplace/auction/:id` redirects to `/stellar/marketplace` (auction disabled)
4. **Capability queries work**: `isCapabilityAvailable('marketplace.leverageBuy')` returns `true` on Mantle, `false` on Stellar
5. **No wagmi imports outside providers**: `grep -r "from 'wagmi'" src/` only matches files in `src/lib/strategies/*/Evm*`, `src/app/providers/Wallet*`, `src/hooks/useWalletIntegrityMonitor.ts`, and `src/hooks/useAuctionContracts.ts`
6. **Navigation is network-prefixed**: No remaining `navigate('/path')` without `networkPath()` in any page file
7. **Network switch preserves context**: Clicking network switcher on `/mantle/marketplace` goes to `/stellar/marketplace` without errors
