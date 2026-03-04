# Multi-Network Single-Backend Frontend Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the frontend from two separate per-network API URLs to a single backend URL with an `X-Network` HTTP header, add `mantle` as a third network, and make the entire network system config-driven so future chains require zero code changes.

**Architecture:** `network.config.ts` becomes the single source of truth — all network definitions, the env-driven default, and a shared `getNetworkFromPath()` utility live there. `base.service.ts` is updated to always use `VITE_API_URL` and inject the `X-Network` header automatically. Every other file that previously duplicated inline network-guard logic is updated to import and call `getNetworkFromPath()` instead.

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, Zustand, TanStack Query, Wagmi + RainbowKit (EVM), Freighter (Stellar)

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/lib/network/network.config.ts` | **Modify** | Add `mantle`, change `NetworkType` to `keyof typeof NETWORK_CONFIGS`, env-driven default, single `apiUrl`, export `getNetworkFromPath()` |
| `src/lib/api/base.service.ts` | **Modify** | Remove dual-URL logic, single `VITE_API_URL`, add `X-Network` header in `getHeaders()` and `getAuthHeaders()` |
| `src/stores/auth.store.ts` | **Modify** | Replace inline network guard with `getNetworkFromPath()`, replace `['arbitrum','stellar'].forEach` with `SUPPORTED_NETWORKS` |
| `src/lib/utils/error-handler.ts` | **Modify** | Replace both inline network guards with `getNetworkFromPath()` + `SUPPORTED_NETWORKS` |
| `src/lib/api/auth.service.ts` | **Modify** | Replace private `getNetwork()` body with `getNetworkFromPath()` |
| `src/lib/api/kyc.service.ts` | **Modify** | Replace private `getNetwork()` body with `getNetworkFromPath()` |
| `src/lib/api/notification.service.ts` | **Modify** | Replace private `getNetwork()` body with `getNetworkFromPath()` |
| `src/lib/api/admin.service.ts` | **Modify** | Replace private `getNetwork()` body with `getNetworkFromPath()` |
| `src/lib/api/issuer.service.ts` | **Modify** | Replace private `getNetwork()` body with `getNetworkFromPath()` |
| `src/app/router/public.routes.tsx` | **Modify** | Use `DEFAULT_NETWORK` for root redirect and legacy redirects |
| `src/app/layouts/NetworkLayout.tsx` | **Modify** | Branch on `network.walletType === 'stellar'` instead of `networkType === 'stellar'` |
| `src/lib/api/yield.service.factory.ts` | **Modify** | Use `NETWORK_CONFIGS[network]?.walletType === 'stellar'` instead of `network === 'stellar'` |
| `src/components/common/NetworkSwitcher.tsx` | **Modify** | Render from `NETWORK_CONFIGS` dynamically instead of hardcoded Arbitrum button |
| `src/pages/marketplace/auction/AuctionDetails.page.tsx` | **Modify** | `isEvm = network.walletType === 'evm'` |
| `src/pages/marketplace/asset/AssetDetails.page.tsx` | **Modify** | `isEvm = network.walletType === 'evm'` |
| `src/pages/admin/operations/OperationsView.page.tsx` | **Modify** | Use `network.displayName` instead of hardcoded `'arbitrum'` string |
| `.env` | **Modify** | Add `VITE_DEFAULT_NETWORK=mantle`, deprecate per-network API URL vars |

---

## Chunk 1: Core Network Config — Foundation

### Task 1: Update `network.config.ts` — Single Source of Truth

**Files:**
- Modify: `src/lib/network/network.config.ts`

This is the most important change. Everything else in this plan depends on it. Read the file before editing.

- [ ] **Step 1: Replace the entire file content**

```typescript
// src/lib/network/network.config.ts

export interface NetworkFeatures {
  leverage: boolean;
  faucet: boolean;
  solvency: boolean;
  secondaryMarket: boolean;
  borrow: boolean;
}

export interface NetworkConfig {
  type: string;
  displayName: string;
  apiUrl: string;
  explorerUrl: string;
  features: NetworkFeatures;
  walletType: 'evm' | 'stellar';
}

// ─── Single shared API URL ────────────────────────────────────────────────────
// All networks are served by one backend process. The X-Network header
// tells the backend which chain a request belongs to.
const SHARED_API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// ─── Network Registry ─────────────────────────────────────────────────────────
// To add a new chain: add one entry here. Zero other code changes needed.
export const NETWORK_CONFIGS = {
  mantle: {
    type: 'mantle',
    displayName: 'Mantle',
    apiUrl: SHARED_API_URL,
    explorerUrl: 'https://explorer.testnet.mantle.xyz',
    features: { leverage: true, faucet: true, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'evm' as const,
  },
  arbitrum: {
    type: 'arbitrum',
    displayName: 'Arbitrum',
    apiUrl: SHARED_API_URL,
    explorerUrl: 'https://sepolia.arbiscan.io',
    features: { leverage: true, faucet: true, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'evm' as const,
  },
  stellar: {
    type: 'stellar',
    displayName: 'Stellar',
    apiUrl: SHARED_API_URL,
    explorerUrl: 'https://stellar.expert/explorer/testnet',
    features: { leverage: false, faucet: false, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'stellar' as const,
  },
} satisfies Record<string, NetworkConfig>;

// ─── Derived types ────────────────────────────────────────────────────────────
// NetworkType is automatically the union of all keys in NETWORK_CONFIGS.
// Adding a new network above automatically widens this type.
export type NetworkType = keyof typeof NETWORK_CONFIGS;

// ─── Supported networks list ──────────────────────────────────────────────────
export const SUPPORTED_NETWORKS = Object.keys(NETWORK_CONFIGS) as NetworkType[];

// ─── Default network ──────────────────────────────────────────────────────────
// Controlled by VITE_DEFAULT_NETWORK env variable.
// Change the env var — no code changes needed.
export const DEFAULT_NETWORK: NetworkType =
  (import.meta.env.VITE_DEFAULT_NETWORK as NetworkType | undefined) &&
  (import.meta.env.VITE_DEFAULT_NETWORK in NETWORK_CONFIGS)
    ? (import.meta.env.VITE_DEFAULT_NETWORK as NetworkType)
    : 'mantle';

// ─── Path utility ─────────────────────────────────────────────────────────────
// Used by services that need the current network outside of React context.
// Reads the first URL path segment and validates it against NETWORK_CONFIGS.
// Falls back to DEFAULT_NETWORK for unknown segments.
export const getNetworkFromPath = (): NetworkType => {
  const segment = window.location.pathname.split('/')[1];
  return segment in NETWORK_CONFIGS
    ? (segment as NetworkType)
    : DEFAULT_NETWORK;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kaushalchaudhari/Desktop/web3/mantle/TOA-Client-Mantle
npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only from files that still import the old `NetworkType` union — those will be fixed in subsequent tasks. No errors should come from `network.config.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/lib/network/network.config.ts
git commit -m "feat: add mantle network, env-driven default, single API URL, getNetworkFromPath utility"
```

---

### Task 2: Update `base.service.ts` — Single URL + X-Network Header

**Files:**
- Modify: `src/lib/api/base.service.ts`

This is the second most critical change. After this, every HTTP request the frontend makes will carry the `X-Network` header automatically. No individual service needs to know about header injection.

- [ ] **Step 1: Replace the `baseURL` getter and `getHeaders`/`getAuthHeaders` methods**

Find the current `baseURL` getter (lines ~21–29) and the `getHeaders`/`getAuthHeaders` methods (lines ~32–62). Replace them with:

```typescript
import { getNetworkFromPath } from '../network/network.config';
```

Add this import at the top of the file alongside `handleAPIError`.

Then replace the three methods:

```typescript
  protected get baseURL(): string {
    // All networks are served by one backend. The X-Network header routes the request.
    return import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  }

  protected getHeaders = () => {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'X-Network': getNetworkFromPath(),
    };
    return headers;
  }

  protected getAuthHeaders = (required: boolean = true) => {
    const network = getNetworkFromPath();
    const token =
      localStorage.getItem(`${network}_access_token`) ??
      localStorage.getItem('access_token'); // legacy fallback

    if (!token && required) {
      console.warn(`[BaseService] Missing token for required auth. Network: ${network}`);
      handleAPIError(new Error('Not a verified user'));
    }

    return {
      ...this.getHeaders(),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }
```

Note: The `_baseURL` constructor parameter and the `if (this._baseURL) return this._baseURL` branch can be removed — nothing in the codebase passes a `baseURL` to the constructor. Simplify the class:

```typescript
class BaseService {
  protected get baseURL(): string {
    return import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  }
  // ... rest of methods
}
```

Remove the constructor entirely (it only set `this._baseURL = baseURL ?? ''`).

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/base.service.ts
git commit -m "feat: base service uses single API URL and injects X-Network header on every request"
```

---

## Chunk 2: Deduplication — Replace Inline Network Guards

All 7 files below have the same copy-pasted pattern:
```typescript
const segment = window.location.pathname.split('/')[1];
return ['arbitrum', 'stellar'].includes(segment) ? segment : 'arbitrum';
```
Each task is the same mechanical replacement: import `getNetworkFromPath`, call it.

### Task 3: Update `auth.service.ts`

**Files:**
- Modify: `src/lib/api/auth.service.ts`

- [ ] **Step 1: Add import and update `getNetwork()`**

At the top of the file, add:
```typescript
import { getNetworkFromPath } from '../network/network.config';
```

Replace the private method body (lines ~28–31):
```typescript
  private getNetwork(): string {
    return getNetworkFromPath();
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/auth.service.ts
git commit -m "refactor: auth service uses getNetworkFromPath utility"
```

---

### Task 4: Update `kyc.service.ts`

**Files:**
- Modify: `src/lib/api/kyc.service.ts`

- [ ] **Step 1: Add import and update `getNetwork()`**

```typescript
import { getNetworkFromPath } from '../network/network.config';
```

Replace private method body (lines ~19–22):
```typescript
  private getNetwork(): string {
    return getNetworkFromPath();
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/kyc.service.ts
git commit -m "refactor: kyc service uses getNetworkFromPath utility"
```

---

### Task 5: Update `notification.service.ts`

**Files:**
- Modify: `src/lib/api/notification.service.ts`

- [ ] **Step 1: Add import and update `getNetwork()`**

```typescript
import { getNetworkFromPath } from '../network/network.config';
```

Replace private method body (lines ~29–32):
```typescript
  private getNetwork(): string {
    return getNetworkFromPath();
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/notification.service.ts
git commit -m "refactor: notification service uses getNetworkFromPath utility"
```

---

### Task 6: Update `admin.service.ts`

**Files:**
- Modify: `src/lib/api/admin.service.ts`

- [ ] **Step 1: Add import and update `getNetwork()`**

```typescript
import { getNetworkFromPath } from '../network/network.config';
```

Replace private method body (lines ~18–21):
```typescript
  private getNetwork(): string {
    return getNetworkFromPath();
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/admin.service.ts
git commit -m "refactor: admin service uses getNetworkFromPath utility"
```

---

### Task 7: Update `issuer.service.ts`

**Files:**
- Modify: `src/lib/api/issuer.service.ts`

- [ ] **Step 1: Add import and update `getNetwork()`**

```typescript
import { getNetworkFromPath } from '../network/network.config';
```

Replace private method body (lines ~25–28):
```typescript
  private getNetwork(): string {
    return getNetworkFromPath();
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/issuer.service.ts
git commit -m "refactor: issuer service uses getNetworkFromPath utility"
```

---

### Task 8: Update `auth.store.ts`

**Files:**
- Modify: `src/stores/auth.store.ts`

This file has three distinct spots to update: the initial state computation, `setAuthenticatedWallet`, and the `logout` action.

- [ ] **Step 1: Add imports**

```typescript
import { getNetworkFromPath, SUPPORTED_NETWORKS } from '../lib/network/network.config';
```

- [ ] **Step 2: Update initial `authenticatedWalletAddress` computation (line ~28–31)**

Replace:
```typescript
authenticatedWalletAddress: (() => {
  const segment = window.location.pathname.split('/')[1];
  const network = ['arbitrum', 'stellar'].includes(segment) ? segment : 'arbitrum';
  return localStorage.getItem(`${network}_authenticated_wallet_address`) || localStorage.getItem('authenticated_wallet_address');
})(),
```
With:
```typescript
authenticatedWalletAddress: (() => {
  const network = getNetworkFromPath();
  return localStorage.getItem(`${network}_authenticated_wallet_address`) || localStorage.getItem('authenticated_wallet_address');
})(),
```

- [ ] **Step 3: Update `setAuthenticatedWallet` (lines ~51–53)**

Replace:
```typescript
const segment = window.location.pathname.split('/')[1];
const network = ['arbitrum', 'stellar'].includes(segment) ? segment : 'arbitrum';
```
With:
```typescript
const network = getNetworkFromPath();
```

- [ ] **Step 4: Update `logout` forEach (line ~61)**

Replace:
```typescript
['arbitrum', 'stellar'].forEach(n => {
```
With:
```typescript
SUPPORTED_NETWORKS.forEach(n => {
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/auth.store.ts
git commit -m "refactor: auth store uses getNetworkFromPath and SUPPORTED_NETWORKS — auto-includes new chains"
```

---

### Task 9: Update `error-handler.ts`

**Files:**
- Modify: `src/lib/utils/error-handler.ts`

This file has two occurrences of the inline guard and one `forEach` that need updating.

- [ ] **Step 1: Add imports**

```typescript
import { getNetworkFromPath, SUPPORTED_NETWORKS } from '../network/network.config';
```

- [ ] **Step 2: Update `handle401Unauthorized` (lines ~28–29)**

Replace:
```typescript
const segment = window.location.pathname.split('/')[1];
const network = ['arbitrum', 'stellar'].includes(segment) ? segment : 'arbitrum';

// Clear all auth-related data from localStorage
['arbitrum', 'stellar'].forEach(n => {
```
With:
```typescript
const network = getNetworkFromPath();

// Clear all auth-related data from localStorage
SUPPORTED_NETWORKS.forEach(n => {
```

- [ ] **Step 3: Update `handleAPIError` second occurrence (lines ~73–74)**

Replace:
```typescript
const segment = window.location.pathname.split('/')[1];
const network = ['arbitrum', 'stellar'].includes(segment) ? segment : 'arbitrum';
```
With:
```typescript
const network = getNetworkFromPath();
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/error-handler.ts
git commit -m "refactor: error handler uses getNetworkFromPath and SUPPORTED_NETWORKS"
```

---

## Chunk 3: Routing and Layout

### Task 10: Update Router — Env-Driven Default Redirect

**Files:**
- Modify: `src/app/router/public.routes.tsx`

- [ ] **Step 1: Add import**

At the top of the file, add:
```typescript
import { DEFAULT_NETWORK } from '../../lib/network/network.config';
```

- [ ] **Step 2: Update root redirect (line ~48)**

Replace:
```tsx
{
  path: '/',
  element: <Navigate to="/arbitrum" replace />,
},
```
With:
```tsx
{
  path: '/',
  element: <Navigate to={`/${DEFAULT_NETWORK}`} replace />,
},
```

- [ ] **Step 3: Update all legacy redirects (lines ~176–182)**

Replace the legacy redirect block:
```tsx
// Legacy Redirects
{ path: '/marketplace', element: <Navigate to="/arbitrum/marketplace" replace /> },
{ path: '/auth', element: <Navigate to="/arbitrum/auth" replace /> },
{ path: '/portfolio', element: <Navigate to="/arbitrum/portfolio" replace /> },
{ path: '/admin', element: <Navigate to="/arbitrum/admin" replace /> },
{ path: '/trade/*', element: <Navigate to="/arbitrum/trade" replace /> },
{ path: '/faucet', element: <Navigate to="/arbitrum/faucet" replace /> },
{ path: '/borrow', element: <Navigate to="/arbitrum/borrow" replace /> },
```
With:
```tsx
// Legacy Redirects — use DEFAULT_NETWORK so changing the env var keeps these correct
{ path: '/marketplace', element: <Navigate to={`/${DEFAULT_NETWORK}/marketplace`} replace /> },
{ path: '/auth', element: <Navigate to={`/${DEFAULT_NETWORK}/auth`} replace /> },
{ path: '/portfolio', element: <Navigate to={`/${DEFAULT_NETWORK}/portfolio`} replace /> },
{ path: '/admin', element: <Navigate to={`/${DEFAULT_NETWORK}/admin`} replace /> },
{ path: '/trade/*', element: <Navigate to={`/${DEFAULT_NETWORK}/trade`} replace /> },
{ path: '/faucet', element: <Navigate to={`/${DEFAULT_NETWORK}/faucet`} replace /> },
{ path: '/borrow', element: <Navigate to={`/${DEFAULT_NETWORK}/borrow`} replace /> },
```

- [ ] **Step 4: Commit**

```bash
git add src/app/router/public.routes.tsx
git commit -m "feat: router uses DEFAULT_NETWORK env var for root and legacy redirects"
```

---

### Task 11: Update `NetworkLayout.tsx` — walletType-Based Branching

**Files:**
- Modify: `src/app/layouts/NetworkLayout.tsx`

Currently this checks `networkType === 'stellar'` — hardcoded string. After this change, any new EVM chain added to `NETWORK_CONFIGS` with `walletType: 'evm'` will automatically route to the EVM wallet branch.

- [ ] **Step 1: Update the network check**

Change the destructure on line 14 from:
```typescript
const { networkType } = useNetwork();
```
To:
```typescript
const { network } = useNetwork();
```

Change the condition on line 21 from:
```tsx
{networkType === 'stellar' ? (
```
To:
```tsx
{network.walletType === 'stellar' ? (
```

Also update the console.log on line 16:
```typescript
console.log('🏗️ NetworkLayout mounting for network:', network.type);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "NetworkLayout" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layouts/NetworkLayout.tsx
git commit -m "feat: NetworkLayout branches on walletType — new EVM chains auto-route to EVM branch"
```

---

## Chunk 4: Factory and Component Updates

### Task 12: Update `yield.service.factory.ts`

**Files:**
- Modify: `src/lib/api/yield.service.factory.ts`

- [ ] **Step 1: Add import and update the factory**

Add import:
```typescript
import { NETWORK_CONFIGS } from '../network/network.config';
```

Replace the check:
```typescript
export const getYieldService = (network: NetworkType): YieldService => {
    if (network === 'stellar') {
        return stellarYieldService as YieldService;
    }
    return contractService as unknown as YieldService;
};
```
With:
```typescript
export const getYieldService = (network: NetworkType): YieldService => {
    if (NETWORK_CONFIGS[network]?.walletType === 'stellar') {
        return stellarYieldService as YieldService;
    }
    return contractService as unknown as YieldService;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/yield.service.factory.ts
git commit -m "refactor: yield factory uses walletType check — works for any stellar-type chain"
```

---

### Task 13: Update `NetworkSwitcher.tsx` — Dynamic Network Buttons

**Files:**
- Modify: `src/components/common/NetworkSwitcher.tsx`

Currently renders a single hardcoded "Arbitrum" button. After this change it reads from `NETWORK_CONFIGS` and renders a button for every registered network.

- [ ] **Step 1: Replace the component**

```tsx
import { useNavigate, useLocation } from "react-router-dom";
import { useNetwork } from "../../lib/network/NetworkContext";
import { NETWORK_CONFIGS, SUPPORTED_NETWORKS } from "../../lib/network/network.config";
import type { NetworkType } from "../../lib/network/network.config";

export const NetworkSwitcher = () => {
    const { networkType } = useNetwork();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSwitch = (targetNetwork: NetworkType) => {
        if (targetNetwork === networkType) return;

        const pathParts = location.pathname.split('/');
        const currentSubPath = pathParts.slice(2).join('/');
        navigate(`/${targetNetwork}/${currentSubPath}`);
    };

    return (
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full border border-gray-200">
            {SUPPORTED_NETWORKS.map((net) => (
                <button
                    key={net}
                    onClick={() => handleSwitch(net)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        net === networkType
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-500 hover:text-black'
                    }`}
                >
                    {NETWORK_CONFIGS[net].displayName}
                </button>
            ))}
        </div>
    );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/common/NetworkSwitcher.tsx
git commit -m "feat: NetworkSwitcher renders all networks from NETWORK_CONFIGS dynamically"
```

---

## Chunk 5: Page-Level `isEvm` Fixes

### Task 14: Update `AuctionDetails.page.tsx`

**Files:**
- Modify: `src/pages/marketplace/auction/AuctionDetails.page.tsx`

- [ ] **Step 1: Update destructure and `isEvm` (lines ~23–24)**

Change:
```typescript
const { networkType, networkPath } = useNetwork();
const isEvm = networkType === 'arbitrum';
```
To:
```typescript
const { networkType, networkPath, network } = useNetwork();
const isEvm = network.walletType === 'evm';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "AuctionDetails" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/marketplace/auction/AuctionDetails.page.tsx
git commit -m "fix: auction page isEvm uses walletType — mantle and arbitrum both detected as EVM"
```

---

### Task 15: Update `AssetDetails.page.tsx`

**Files:**
- Modify: `src/pages/marketplace/asset/AssetDetails.page.tsx`

- [ ] **Step 1: Update destructure and `isEvm` (line ~44)**

Change:
```typescript
const isEvm = networkType === 'arbitrum';
```
To:
```typescript
const { ..., network } = useNetwork();  // add network to existing destructure
const isEvm = network.walletType === 'evm';
```

Find the existing `useNetwork()` call in the file (around line 44), add `network` to its destructure, and update the `isEvm` assignment.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "AssetDetails" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/marketplace/asset/AssetDetails.page.tsx
git commit -m "fix: asset details page isEvm uses walletType"
```

---

### Task 16: Update `OperationsView.page.tsx`

**Files:**
- Modify: `src/pages/admin/operations/OperationsView.page.tsx`

- [ ] **Step 1: Update the network name and token standard lines (lines ~22–23)**

Change:
```typescript
const networkName = networkType === 'stellar' ? 'Stellar' : 'arbitrum';
const tokenStandard = networkType === 'stellar' ? 'Stellar Asset' : 'ERC-3643';
```
To:
```typescript
const { networkType, network } = useNetwork();
const networkName = network.displayName;
const tokenStandard = network.walletType === 'stellar' ? 'Stellar Asset' : 'ERC-3643';
```

Note: `network.displayName` already has the correct display name for every registered network (e.g., `'Mantle'`, `'Arbitrum'`, `'Stellar'`) — no manual string needed.

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/operations/OperationsView.page.tsx
git commit -m "fix: operations view uses network.displayName and walletType instead of hardcoded strings"
```

---

## Chunk 6: Environment and Final Verification

### Task 17: Update `.env`

**Files:**
- Modify: `.env`

- [ ] **Step 1: Add `VITE_DEFAULT_NETWORK` and annotate deprecated vars**

Add to `.env`:
```
# Default network — change this env var to switch the landing network without code changes.
# Accepted values: any key from NETWORK_CONFIGS (mantle, arbitrum, stellar, ...)
VITE_DEFAULT_NETWORK=mantle
```

Mark the per-network API URL vars as deprecated (they are no longer used by the frontend — all requests go to VITE_API_URL):
```
# DEPRECATED: The frontend now sends X-Network header to VITE_API_URL for all networks.
# These vars are kept for reference only and are not read by any service.
# VITE_ARBITRUM_API_URL=https://mantlebackend-production-eb02.up.railway.app
# VITE_STELLAR_API_URL=http://10.155.192.252:3000
```

- [ ] **Step 2: Commit**

```bash
git add .env
git commit -m "config: add VITE_DEFAULT_NETWORK=mantle, annotate deprecated per-network URL vars"
```

---

### Task 18: Full TypeScript Verification

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: No errors. If there are errors, they will name the file and line. Fix each one — they will almost certainly be places where `NetworkType` is compared with a string literal like `=== 'arbitrum'` that now needs updating to use `network.walletType` or a `NETWORK_CONFIGS` lookup instead.

- [ ] **Step 2: Run the dev server and verify all three networks load**

```bash
npm run dev
```

Open each network in the browser:
- `http://localhost:5173/mantle` — should load the home page with EVM wallet providers
- `http://localhost:5173/arbitrum` — same, EVM wallet providers
- `http://localhost:5173/stellar` — should load with Stellar auth provider
- `http://localhost:5173/` — should redirect to `/mantle` (because `VITE_DEFAULT_NETWORK=mantle`)

Open the browser DevTools Network tab, make any API call (e.g., visit marketplace). Every request should show the `X-Network` header in its request headers.

- [ ] **Step 3: Verify NetworkSwitcher shows all 3 networks**

The switcher in the navbar should show `Mantle`, `Arbitrum`, and `Stellar` buttons. Clicking each should navigate to the correct network URL while preserving the current sub-path.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass — multi-network single-backend frontend complete"
```

---

## Summary

After this plan is fully executed:

| Concern | Before | After |
|---------|--------|-------|
| API endpoints | 2 different URLs (stellar vs arbitrum) | 1 URL (`VITE_API_URL`) |
| Network routing to backend | URL-based API selection | `X-Network` header on every request |
| Supported networks | `arbitrum`, `stellar` | `mantle`, `arbitrum`, `stellar` |
| Default network | hardcoded `arbitrum` | `VITE_DEFAULT_NETWORK` env var |
| Adding a 4th network | Edit 8+ files | Add one entry to `NETWORK_CONFIGS` |
| `isEvm` detection | `networkType === 'arbitrum'` | `network.walletType === 'evm'` |
| Network guard pattern | Copy-pasted in 8 files | Centralised in `getNetworkFromPath()` |
| NetworkSwitcher | Hardcoded Arbitrum button | Rendered from `NETWORK_CONFIGS` |
