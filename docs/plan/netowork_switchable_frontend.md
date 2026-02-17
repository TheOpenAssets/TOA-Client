# Plan: Multi-Network Frontend Architecture (`/:network/` routing)

## Context

The backend now supports two independent deployments — one for Mantle (EVM) and one for Stellar — each running at a separate API URL. The frontend needs to serve both simultaneously under network-prefixed routes (`/mantle/…`, `/stellar/…`), routing API calls to the correct backend, conditionally showing/hiding features unavailable on a given network, and mounting the right wallet provider (RainbowKit/Wagmi for EVM, Freighter stub for Stellar). Auth tokens must be scoped per network so a user can independently log in on both.

---

## Architecture Overview

```
/                           → Redirect to /mantle
/:network/*                 → NetworkProvider reads param, validates, sets context
  ├── NetworkLayout         → Mounts correct wallet provider based on network
  ├── Navbar                → Links use networkPath(), feature items conditionally shown
  ├── FeatureGuard          → Wraps feature-gated routes; redirects if disabled
  └── All existing pages    → Unchanged internals; API calls auto-route via BaseService

API calls: BaseService reads window.location.pathname[1] → resolves backend URL
Auth tokens: keyed as `mantle_access_token`, `stellar_access_token` in localStorage
```

---

## Files to Create (5 new files)

| File | Purpose |
|------|---------|
| `src/lib/network/network.config.ts` | Per-network config: API URL, feature flags, wallet type |
| `src/lib/network/NetworkContext.tsx` | React context + `useNetwork()` hook |
| `src/app/providers/NetworkProvider.tsx` | Reads `:network` param, validates, provides context |
| `src/app/layouts/NetworkLayout.tsx` | Mounts correct wallet provider; renders `<Outlet />` |
| `src/components/common/FeatureGuard.tsx` | Redirects to network home if feature is disabled |

---

## Files to Modify

| File | Change Summary |
|------|---------------|
| `src/app/router/public.routes.tsx` | Restructure: root→redirect, `/:network` parent with NetworkProvider+NetworkLayout, legacy redirects |
| `src/App.tsx` | Remove `WalletProvider`/`WalletIntegrityProvider` wrappers (moved to NetworkLayout) |
| `src/lib/api/base.service.ts` | `baseURL` becomes a dynamic getter (reads network from `window.location`); auth header reads network-scoped token |
| `src/lib/api/auth.service.ts` | Remove hardcoded `API_BASE_URL`, call `super()` with no args, write network-scoped tokens on login |
| All other 12 service files in `src/lib/api/` | Same: remove hardcoded `API_BASE_URL`, call `super()` with no args |
| `src/stores/auth.store.ts` | `logout()` clears network-scoped token keys; `authenticatedWalletAddress` keyed per network |
| `src/lib/utils/error-handler.ts` | `handle401Unauthorized` clears network-scoped tokens and redirects to `/${network}` |
| `src/components/common/Navbar.tsx` | Links use `networkPath()`, hide Borrow/Faucet based on `isFeatureAvailable()` |
| `.env.example` | Add `VITE_MANTLE_API_URL`, `VITE_STELLAR_API_URL` |

---

## Implementation Steps

### Phase 1 — Network Config & Context

**1. Create `src/lib/network/network.config.ts`**
```typescript
export type NetworkType = 'mantle' | 'stellar';

export interface NetworkFeatures {
  leverage: boolean;
  faucet: boolean;
  solvency: boolean;
  secondaryMarket: boolean;
  borrow: boolean;
}

export interface NetworkConfig {
  type: NetworkType;
  displayName: string;
  apiUrl: string;
  features: NetworkFeatures;
  walletType: 'evm' | 'stellar';
}

export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  mantle: {
    type: 'mantle',
    displayName: 'Mantle',
    apiUrl: import.meta.env.VITE_MANTLE_API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
    features: { leverage: true, faucet: true, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'evm',
  },
  stellar: {
    type: 'stellar',
    displayName: 'Stellar',
    apiUrl: import.meta.env.VITE_STELLAR_API_URL ?? 'http://localhost:3001',
    features: { leverage: false, faucet: false, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'stellar',
  },
};

export const SUPPORTED_NETWORKS: NetworkType[] = ['mantle', 'stellar'];
export const DEFAULT_NETWORK: NetworkType = 'mantle';
```

**2. Create `src/lib/network/NetworkContext.tsx`**
- `NetworkContextValue` exposes: `network`, `networkType`, `isFeatureAvailable(feature)`, `networkPath(path)` (prepends `/${networkType}`)
- Export `useNetwork()` hook (throws if used outside provider)

**3. Create `src/app/providers/NetworkProvider.tsx`**
- Reads `useParams<{ network: string }>()`
- If invalid network → `<Navigate to={`/${DEFAULT_NETWORK}`} replace />`
- Otherwise sets `NetworkContext.Provider` with the resolved config

### Phase 2 — Routing Restructure

**4. Create `src/app/layouts/NetworkLayout.tsx`**
```tsx
const NetworkLayout = () => {
  const { networkType } = useNetwork();
  if (networkType === 'stellar') {
    return (
      <StellarWalletProvider>   {/* stub — see note below */}
        <Outlet />
      </StellarWalletProvider>
    );
  }
  return (
    <WalletProvider>
      <WalletIntegrityProvider>
        <Outlet />
      </WalletIntegrityProvider>
    </WalletProvider>
  );
};
```
> `StellarWalletProvider` is a thin stub (`<QueryClientProvider><>{children}</></QueryClientProvider>`) — full Freighter integration is out of scope until Stellar contracts are deployed. It satisfies React Query needs without EVM hooks crashing.

**5. Create `src/components/common/FeatureGuard.tsx`**
```tsx
const FeatureGuard = ({ feature, children }) => {
  const { isFeatureAvailable, networkPath } = useNetwork();
  return isFeatureAvailable(feature) ? <>{children}</> : <Navigate to={networkPath('/')} replace />;
};
```

**6. Restructure `src/app/router/public.routes.tsx`**
- Root `/` → `<Navigate to="/mantle" replace />`
- Single `/:network` route with `element: <NetworkProvider><NetworkLayout /></NetworkProvider>` and all current routes as `children` (paths become relative, e.g. `marketplace`, `auth`, `admin`, etc.)
- Feature-gated children wrapped in `<FeatureGuard feature="faucet">` etc.
- Legacy redirects at root level: `/marketplace` → `/mantle/marketplace`, `/auth` → `/mantle/auth`, etc. for the 8 most common paths

**7. Update `src/App.tsx`**
Remove `WalletProvider` and `WalletIntegrityProvider` — they now live in `NetworkLayout`:
```tsx
function App() {
  return <RouterProvider router={router} />;
}
```

### Phase 3 — Network-Aware API Layer

**8. Update `src/lib/api/base.service.ts`**

Replace the `protected baseURL: string` field with a getter:
```typescript
class BaseService {
  private _baseURL: string;

  constructor(baseURL?: string) {
    this._baseURL = baseURL ?? '';
  }

  protected get baseURL(): string {
    if (this._baseURL) return this._baseURL;
    // Dynamic resolution from current route
    const segment = window.location.pathname.split('/')[1];
    if (segment === 'stellar') {
      return import.meta.env.VITE_STELLAR_API_URL ?? 'http://localhost:3001';
    }
    return import.meta.env.VITE_MANTLE_API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  }

  protected getAuthHeaders = () => {
    const segment = window.location.pathname.split('/')[1];
    const network = ['mantle','stellar'].includes(segment) ? segment : 'mantle';
    const token = localStorage.getItem(`${network}_access_token`)
      ?? localStorage.getItem('access_token'); // legacy fallback
    if (!token) handleAPIError(new Error('Not a verified user'));
    return { ...this.getHeaders(), 'Authorization': `Bearer ${token}` };
  }
}
```

**9. Update all 13 service files** — remove `const API_BASE_URL = ...` and change `super(API_BASE_URL)` → `super()`. Files:
- `auth.service.ts`, `kyc.service.ts`, `marketplace.service.ts`, `portfolio.service.ts`, `issuer.service.ts`, `admin.service.ts`, `leverage.service.ts`, `faucet.service.ts`, `contract.service.ts`, `solvency-contract.service.ts`, `notification.service.ts`, `asset.service.ts`, `changelog.service.ts`

Also update `auth.service.ts` `login()` to store network-scoped tokens:
```typescript
const segment = window.location.pathname.split('/')[1];
const network = ['mantle','stellar'].includes(segment) ? segment : 'mantle';
localStorage.setItem(`${network}_access_token`, data.tokens.access);
localStorage.setItem(`${network}_refresh_token`, data.tokens.refresh);
```

**10. Update `src/stores/auth.store.ts`**

Update `logout()` to clear all network-scoped keys:
```typescript
logout: () => {
  ['mantle','stellar'].forEach(n => {
    localStorage.removeItem(`${n}_access_token`);
    localStorage.removeItem(`${n}_refresh_token`);
    localStorage.removeItem(`${n}_authenticated_wallet_address`);
  });
  // legacy cleanup
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('authenticated_wallet_address');
  set({ user: null, isAuthenticated: false, isLoading: false, authenticatedWalletAddress: null });
}
```

**11. Update `src/lib/utils/error-handler.ts`**

`handle401Unauthorized`:
```typescript
export const handle401Unauthorized = (): void => {
  const segment = window.location.pathname.split('/')[1];
  const network = ['mantle','stellar'].includes(segment) ? segment : 'mantle';
  ['mantle','stellar'].forEach(n => {
    localStorage.removeItem(`${n}_access_token`);
    localStorage.removeItem(`${n}_refresh_token`);
  });
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('authenticated_wallet_address');
  window.location.href = `/${network}`;
};
```

### Phase 4 — UI Updates

**12. Update `src/components/common/Navbar.tsx`**
- Import `useNetwork`
- Replace `navigate('/marketplace')` etc. with `navigate(networkPath('/marketplace'))`
- Wrap "Borrow" button: only render if `isFeatureAvailable('borrow')`
- Wrap "Faucet" link (if present in nav): only render if `isFeatureAvailable('faucet')`
- Add a **NetworkSwitcher** component inline in the Navbar (no separate file needed):
  - Renders a small pill/toggle showing the current network (e.g. "Mantle" | "Stellar")
  - On click, switches to `/${otherNetwork}${currentSubPath}` where `currentSubPath` is everything after `/:network` (e.g. `/mantle/marketplace` → `/stellar/marketplace`). If the destination path is feature-gated and unavailable on the target network, fall back to `/${otherNetwork}` home.
  - Uses `useNavigate` + `useLocation` to compute the target URL
  - Styled to match the existing nav pill design (gray-100 background, rounded-full)

**13. Update `.env.example`**
```
# --- Mantle Backend ---
VITE_MANTLE_API_URL=http://localhost:3000
# --- Stellar Backend ---
VITE_STELLAR_API_URL=http://localhost:3001
# --- Legacy (used as MANTLE fallback) ---
VITE_API_URL=http://localhost:3000
```

---

- **Freighter wallet integration**: Stellar's `StellarWalletProvider`. Full Freighter wallet auth (sign challenge, connect) needs to be done.
- **Stellar contract addresses**: `.env` EVM addresses stay as-is; Stellar Soroban contract IDs will be added 

## What's Explicitly Out of Scope


- **Frontend contract services** (`contract.service.ts`, `solvency-contract.service.ts`): EVM-only Wagmi hooks; only loaded under Mantle routes, no changes needed

---

## Verification

1. **Root redirect**: `http://localhost:5173/` → `http://localhost:5173/mantle`
2. **Mantle routes work**: `/mantle/marketplace`, `/mantle/auth`, `/mantle/admin` all load correctly
3. **Stellar routes render**: `/stellar/marketplace` loads without crashing (no EVM hooks)
4. **Feature guard**: `/stellar/faucet` redirects to `/stellar/` (faucet disabled)
5. **API routing**: Under `/mantle/*`, all fetch calls go to `VITE_MANTLE_API_URL`. Under `/stellar/*`, to `VITE_STELLAR_API_URL`. Verify in DevTools Network tab
6. **Independent auth**: Login on `/mantle/auth` → `mantle_access_token` in localStorage. Login on `/stellar/auth` → `stellar_access_token`. Each network shows correct auth state independently
7. **Legacy redirects**: `/marketplace` → `/mantle/marketplace`, `/auith` → `/mantle/auth`
8. **Logout clears correct tokens**: Logout on Mantle clears `mantle_*` tokens; Stellar tokens survive and vice versa
9. **Navbar hides features on Stellar**: Borrow shows on Mantle, shows on Stellar (both `borrow: true`); Faucet nav item hidden on Stellar
