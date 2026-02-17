# OpenAssets — Project Summary

> TOA-Client-Mantle | Mantle Hackathon 2026

---

## What Is This?

**OpenAssets** is a production-grade, Mantle-native web3 platform for **tokenized Real-World Assets (RWAs)**. It lets users discover, invest in, trade, borrow against, and earn yield on invoice-backed digital assets — all on-chain.

The codebase is a React + TypeScript single-page application that integrates deeply with EVM smart contracts (primarily on Mantle Sepolia) and supports a secondary Stellar network path. It was built as a hackathon project but follows professional architecture patterns throughout.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19.2 + Vite 7.2 + TypeScript 5.9 |
| Styling | Tailwind CSS 4 + PostCSS |
| Routing | React Router DOM 7 |
| EVM Wallet | RainbowKit 2 + Wagmi 2 + Viem 2 |
| Contract Calls | Ethers.js 6 |
| State (client) | Zustand 5 |
| State (server) | TanStack React Query 5 |
| Charts | ECharts 6 + Recharts 3 |
| Animation | Framer Motion 12 |
| 3D / Shaders | React Three Fiber 9 + Three.js + Paper Design Shaders |
| Icons | Lucide React + Tabler Icons |
| UI Primitives | Radix UI (Dialog, Tabs, Select, Popover, etc.) |

---

## Architecture Overview

### 1. Multi-Network, Feature-Gated Routing

The app mounts under a `/:network` URL prefix. This drives which features are visible:

```
/mantle/*    → full feature set (leverage, faucet, secondary market, borrow)
/stellar/*   → limited feature set (secondary market + borrow only)
```

Feature availability is declared in `src/lib/network/network.config.ts` and enforced at the component level by `<FeatureGuard feature="leverage">`. Unsupported routes redirect to the network root.

### 2. Provider Stack

```
<NetworkProvider>           ← reads :network param, sets context
  <WalletProvider>          ← RainbowKit + Wagmi (EVM)
    <StellarWalletProvider> ← React Query wrapper (Stellar)
      <WalletIntegrityProvider>
        <App />
```

### 3. Service Layer (`src/lib/api/`)

All backend communication goes through class-based services that extend `BaseService`. Each service maps 1-to-1 with a domain:

| Service | Domain |
|---|---|
| `auth.service.ts` | Wallet challenge/response, JWT management |
| `marketplace.service.ts` | Listings, auctions, bids, P2P orders |
| `portfolio.service.ts` | User holdings, purchase notifications |
| `asset.service.ts` | Issuer asset management |
| `issuer.service.ts` | Originator onboarding & profile |
| `solvency.service.ts` | Credit lines, borrow/repay |
| `leverage.service.ts` | mETH leverage positions |
| `admin.service.ts` | Platform admin operations |
| `contract.service.ts` | Generic contract interactions |
| `solvency-contract.service.ts` | Solvency vault contract calls |
| `kyc.service.ts` | KYC flows |
| `faucet.service.ts` | Test token distribution |
| `notification.service.ts` | Real-time notifications |
| `changelog.service.ts` | Platform changelog |

`BaseService` handles: auth headers, 30s timeout via `AbortController`, automatic logout on 401, and ngrok bypass header for local development.

### 4. Zustand Stores (`src/stores/`)

| Store | Manages |
|---|---|
| `auth.store.ts` | Logged-in user, tokens, role |
| `marketplace.store.ts` | Listings, auctions, bids |
| `portfolio.store.ts` | Owned assets, active bids |
| `leverage.store.ts` | mETH positions, harvest history |
| `solvency.store.ts` | Credit lines, loans |
| `admin.store.ts` | Admin dashboard data |
| `changelog.store.ts` | Changelog entries |

All stores follow the same async pattern: `isLoading`, `error`, and action methods that delegate to the service layer.

### 5. TypeScript Types (`src/types/`)

Strict, domain-aligned interfaces for every major entity:
`auth.types.ts` · `marketplace.types.ts` · `issuer.types.ts` · `solvency.types.ts` · `leverage.types.ts` · `admin.types.ts` · `changelog.types.ts`

---

## Core Feature Modules

### Marketplace (Primary)

Routes: `/marketplace`, `/marketplace/asset/:id`, `/marketplace/auction/:id`

- Browse RWA invoice tokens
- **Fixed-price listings** — direct USDC purchase
- **Uniform-price auctions** — submit bids, clearing price set at settlement
- Asset detail pages with document attestation, yield projections, and on-chain registry data

### Secondary Market (P2P Trading)

Route: `/trade/asset/:id` *(Mantle only)*

- Orderbook UI — live buy and sell orders
- Create limit orders for any RWA token
- Fill existing orders from counterparties
- Time-weighted yield transfers with ownership — yield accrual follows the token across trades
- Chart view: execution history + sentiment indicators

### Portfolio

Route: `/portfolio`

- View all owned RWA tokens with current value and accrued yield
- Track pending auction bids
- Monitor active leverage positions
- Monitor active loans

### mETH Leverage *(Mantle-native)*

Available on asset detail pages when purchasing.

The core Mantle-specific differentiator:
- Deposit mETH as collateral → borrow USDC → buy RWA tokens
- mETH staking yield is auto-harvested periodically to repay interest
- Result: near-zero effective borrowing cost
- Health factor monitoring (basis points; 15 000 = 150% = healthy)
- Positions display: collateral, debt, health status, harvest history

### Universal Credit / OAID (Open Access ID)

Route: `/borrow` *(Mantle + Stellar)*

- Deposit RWA tokens as collateral
- Receive a credit line at 70% LTV
- Borrow USDC directly from the platform Senior Pool
- Future: plug into Aave, Compound, and other third-party protocols
- Health factor gating at 110% minimum

### Issuer / Originator Flow

Routes: `/onboarding`, `/issuer/dashboard`, `/issuer/asset/:id`

RWA asset lifecycle:
```
UPLOADED → ATTESTED → REGISTERED → TOKENIZED → LISTED → SETTLED
```
- Upload invoice documents
- Submit for compliance attestation
- Deploy ERC-3643 identity-bound token via `TokenFactory`
- List on primary marketplace (auction or fixed-price)
- Track sales; settle at maturity

### Admin Dashboard

Routes: `/admin/*`

| Section | Purpose |
|---|---|
| Overview | Platform-wide metrics |
| Listings | Approve or reject asset tokenizations |
| Loans | Monitor all active credit positions |
| Compliance | KYC management |
| Operations | System health |
| Payouts | Settlement queue processing |
| Settlements | Handle matured assets |

### Faucet

Route: `/faucet` *(Mantle only)*

Claim test USDC, mETH, and RWA tokens for use on Mantle Sepolia testnet.

---

## Authentication

1. User connects wallet via RainbowKit
2. Backend issues a challenge (nonce-based message)
3. User signs the challenge with their private key
4. Frontend sends signature → backend verifies → issues JWT pair
5. Tokens stored in `localStorage` scoped to network (`mantle_access_token`, `stellar_access_token`)
6. All API calls attach `Authorization: Bearer <token>` via `BaseService`
7. 401 responses trigger automatic logout and redirect to `/auth`

**Roles:** `INVESTOR` · `ORIGINATOR` · `ADMIN`

---

## Smart Contract Layer

**Default network:** Mantle Sepolia (chain ID 5003)

| Contract | Purpose | Env Var |
|---|---|---|
| Primary Marketplace | Auctions + fixed listings | `VITE_PRIMARY_MARKETPLACE_ADDRESS` |
| Secondary Market | P2P orderbook | `VITE_SECONDARY_MARKET` |
| Yield Vault | Yield accrual + distribution | `VITE_YIELD_VAULT_ADDRESS` |
| Token Factory | ERC-3643 token deployment | `VITE_TOKEN_FACTORY` |
| Identity Registry | KYC-bound token permissions | `VITE_IDENTITY_REGISTRY` |
| Leverage Vault | mETH collateral custody | `VITE_LEVERAGE_VAULT` |
| Solvency Vault | RWA collateral for credit | `VITE_SOLVENCY_VAULT` |
| Senior Pool | USDC lending pool | `VITE_SENIOR_POOL` |
| OAID Registry | Universal credit identity | `VITE_OAID` |
| Mock mETH | Test mETH token | `VITE_MOCK_METH` |
| USDC | Test USDC | `VITE_USDC_ADDRESS` |
| Faucet | Token distribution | `VITE_FAUCET` |

---

## Route Map

```
/:network/                          Landing page
/:network/how-it-works              FAQ / documentation
/:network/about                     About
/:network/changelog                 Development changelog

/:network/auth                      Wallet login
/:network/adminAuth                 Admin login
/:network/faucet                    Test tokens  [Mantle only]

/:network/marketplace               Asset discovery
/:network/marketplace/asset/:id     Asset detail + buy
/:network/marketplace/auction/:id   Auction detail + bid

/:network/trade/asset/:id           Secondary market  [Mantle only]
/:network/portfolio                 User holdings
/:network/borrow                    Credit / OAID  [feature-gated]

/:network/onboarding                Issuer registration
/:network/issuer/dashboard          Issuer management
/:network/issuer/asset/:id          Asset management (issuer)

/:network/admin                     Admin dashboard
/:network/admin/listings            Listing approvals
/:network/admin/loans               Loan monitoring
/:network/admin/compliance          KYC
/:network/admin/operations          System health
/:network/admin/payouts             Payout queue
/:network/admin/settlements         Maturity processing

/marketplace → redirect → /mantle/marketplace  (legacy)
/auth        → redirect → /mantle/auth         (legacy)
```

---

## File Structure

```
src/
├── app/
│   ├── layouts/
│   │   └── NetworkLayout.tsx          Multi-network aware shell
│   ├── providers/
│   │   ├── NetworkProvider.tsx        Network context + routing
│   │   ├── WalletProvider.tsx         RainbowKit / Wagmi (EVM)
│   │   ├── StellarWalletProvider.tsx  Stellar (React Query)
│   │   └── WalletIntegrityProvider.tsx
│   └── router/
│       ├── index.tsx                  Router setup
│       └── public.routes.tsx          Route definitions
├── components/
│   ├── ui/                            Primitive components (Radix wrappers)
│   ├── common/
│   │   └── FeatureGuard.tsx           Feature-flag route guard
│   └── ...                            Page-specific component trees
├── lib/
│   ├── api/                           15 service classes
│   ├── blockchain/
│   │   ├── rainbowkit.config.ts
│   │   ├── auction.contract.ts
│   │   ├── leverage.contract.ts
│   │   └── solvency-contract.service.ts
│   ├── network/
│   │   ├── network.config.ts          Per-network feature flags
│   │   └── NetworkContext.tsx
│   ├── utils/                         Formatters, helpers
│   └── data/                          Static/seed data
├── pages/
│   ├── landing/                       Home, About, FAQ, Changelog
│   ├── marketplace/                   Browse + buy
│   ├── secondary-marketplace/         P2P orderbook
│   ├── portfolio/                     Holdings dashboard
│   ├── borrow/                        Credit / OAID
│   ├── issuer/                        Tokenization workflow
│   ├── admin/                         Admin views
│   ├── faucet/                        Test tokens
│   └── public/                        Auth pages
├── stores/                            6 Zustand stores
├── types/                             7 TypeScript definition files
├── styles/
├── App.tsx
└── main.tsx
```

---

## Development

```bash
npm install        # install dependencies
npm run dev        # Vite dev server with HMR
npm run build      # tsc + Vite production build
npm run preview    # preview production build locally
npm run lint       # ESLint
```

### Required `.env` variables

```
VITE_MANTLE_API_URL
VITE_STELLAR_API_URL
VITE_WALLETCONNECT_PROJECT_ID
VITE_FAUCET
VITE_USDC_ADDRESS
VITE_PRIMARY_MARKETPLACE_ADDRESS
VITE_SECONDARY_MARKET
VITE_YIELD_VAULT_ADDRESS
VITE_TOKEN_FACTORY
VITE_IDENTITY_REGISTRY
VITE_MOCK_METH
VITE_LEVERAGE_VAULT
VITE_OAID
VITE_SOLVENCY_VAULT
VITE_SENIOR_POOL
```

---

## Documentation Index

| File | Contents |
|---|---|
| `docs/PROJECT_SUMMARY.md` | This document |
| `docs/IMPLEMENTATION_COMPLETE.md` | Borrowing flow implementation notes |
| `docs/INTEGRATION_STATUS.md` | Marketplace integration status |
| `docs/CONTRACT_INTEGRATION_COMPLETE.md` | Smart contract integration notes |
| `docs/SOLVENCY_VERIFICATION_AUDIT_REPORT.md` | Credit system audit |
| `docs/API_AUDIT_REPORT.md` | API endpoint audit |
| `docs/Solvency_flows.md` | Borrowing & lending flow diagrams |
| `docs/plan/netowork_switchable_frontend.md` | Multi-chain architecture plan |

---

## Status

All major features are implemented and marked complete in the documentation:

- [x] Wallet authentication (challenge/response + JWT)
- [x] Asset discovery marketplace
- [x] Uniform-price auction system
- [x] Secondary P2P orderbook + chart
- [x] mETH leverage (Mantle-native)
- [x] Universal Credit / OAID borrowing
- [x] Issuer tokenization workflow
- [x] Admin dashboard
- [x] KYC / identity registry integration
- [x] Multi-network routing (Mantle + Stellar)
- [x] Feature-gated UI per network
- [x] Test faucet



## Directory striuctre 

 TOA-Client-Mantle git:(main) ✗ tree ./src/
./src/
├── App.tsx
├── app
│   ├── layouts
│   │   └── NetworkLayout.tsx
│   ├── providers
│   │   ├── NetworkProvider.tsx
│   │   ├── StellarWalletProvider.tsx
│   │   ├── WalletIntegrityProvider.tsx
│   │   └── WalletProvider.tsx
│   └── router
│       ├── index.tsx
│       └── public.routes.tsx
├── assets
│   ├── ALogo-removebg-preview.png
│   ├── ALogo-removebg-preview.svg
│   ├── ALogo.png
│   ├── AbLogo.png
│   ├── Orion.png
│   ├── cloud.png
│   └── react.svg
├── components
│   ├── changelog
│   │   ├── ChangelogHotTimeline.tsx
│   │   ├── ChangelogTester.tsx
│   │   ├── CustomGitGraph.tsx
│   │   ├── GitHubCalendar.tsx
│   │   └── index.ts
│   ├── common
│   │   ├── FeatureGuard.tsx
│   │   └── Navbar.tsx
│   ├── faucet
│   │   └── TokenFaucetCard.tsx
│   ├── issuer
│   │   └── AssetUploadModal.tsx
│   ├── leverage
│   │   ├── LeverageForm.tsx
│   │   ├── PositionDetailChart.tsx
│   │   ├── PositionSparkline.tsx
│   │   ├── PositionStats.tsx
│   │   └── PositionsTable.tsx
│   ├── marketplace
│   │   ├── SentimentChart.tsx
│   │   └── TradeChart.tsx
│   ├── notifications
│   │   └── NotificationBell.tsx
│   ├── portfolio
│   │   ├── ActiveBidsTable.tsx
│   │   ├── MiniAreaChart.tsx
│   │   ├── MyAssetsTable.tsx
│   │   ├── MyLoansTable.tsx
│   │   ├── NoAssetsModal.tsx
│   │   ├── PortfolioStats.tsx
│   │   ├── RepayLoanModal.tsx
│   │   └── TradesTable.tsx
│   ├── ui
│   │   ├── 404-page-not-found.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── fadein.tsx
│   │   ├── faq-details.tsx
│   │   ├── file-upload.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── loader.tsx
│   │   ├── page-loader.tsx
│   │   ├── particle-text-effect.tsx
│   │   ├── popover.tsx
│   │   ├── react-tailwind-image-gallery.tsx
│   │   ├── select.tsx
│   │   ├── shimmer-lines.tsx
│   │   ├── sign-in.tsx
│   │   ├── tabs.tsx
│   │   ├── timeline-animation.tsx
│   │   ├── timeline.tsx
│   │   ├── toast.tsx
│   │   ├── vertical-cut-reveal.tsx
│   │   ├── video-player.tsx
│   │   └── wavy.tsx
│   └── wallet
│       ├── ConnectWallet.tsx
│       ├── DocumentUploadModal.tsx
│       └── WalletAddress.tsx
├── constants
│   └── solvency.constants.ts
├── env.d.ts
├── hooks
│   ├── useAuctionContracts.ts
│   ├── useAuthActions.ts
│   ├── useSecondaryMarket.ts
│   ├── useToast.tsx
│   └── useWalletIntegrityMonitor.ts
├── index.css
├── lib
│   ├── api
│   │   ├── admin.service.ts
│   │   ├── asset.service.ts
│   │   ├── auth.service.ts
│   │   ├── base.service.ts
│   │   ├── changelog.service.ts
│   │   ├── contract.service.ts
│   │   ├── faucet.service.ts
│   │   ├── issuer.service.ts
│   │   ├── kyc.service.ts
│   │   ├── leverage.service.ts
│   │   ├── marketplace.service.ts
│   │   ├── notification.service.ts
│   │   ├── portfolio.service.ts
│   │   ├── solvency-contract.service.ts
│   │   └── solvency.service.ts
│   ├── blockchain
│   │   ├── auction.contract.ts
│   │   ├── leverage.contract.ts
│   │   └── rainbowkit.config.ts
│   ├── data
│   │   └── marketplace-helper.ts
│   ├── network
│   │   ├── NetworkContext.tsx
│   │   └── network.config.ts
│   ├── utils
│   │   ├── error-handler.ts
│   │   ├── fetch-interceptor.ts
│   │   ├── portfolioChartGenerator.ts
│   │   └── solvency-adapter.util.ts
│   └── utils.ts
├── main.tsx
├── pages
│   ├── admin
│   │   ├── compliance
│   │   │   └── ComplianceView.page.tsx
│   │   ├── layout
│   │   │   └── AdminLayout.page.tsx
│   │   ├── listings
│   │   │   └── Listings.page.tsx
│   │   ├── loans
│   │   │   └── LoansView.page.tsx
│   │   ├── operations
│   │   │   └── OperationsView.page.tsx
│   │   ├── overview
│   │   │   └── AdminOverview.page.tsx
│   │   ├── payout
│   │   │   └── PayoutView.page.tsx
│   │   └── settlements
│   │       └── SettlementView.page.tsx
│   ├── borrow
│   │   ├── BorrowPage.tsx
│   │   ├── components
│   │   │   ├── DepositCollateralModal.tsx
│   │   │   ├── DirectBorrowModal.tsx
│   │   │   ├── HealthFactorBar.tsx
│   │   │   └── UnifiedBorrowModal.tsx
│   │   └── hooks
│   │       └── useCreditData.ts
│   ├── faucet
│   │   └── Faucet.page.tsx
│   ├── issuer
│   │   ├── asset-details
│   │   │   ├── AssetDetails.page.tsx
│   │   │   └── AssetDetailsWrapper.page.tsx
│   │   └── dashboard
│   │       └── IssuerDashboard.page.tsx
│   ├── landing
│   │   ├── About.page.tsx
│   │   ├── Changelog.page.tsx
│   │   ├── FAQ.page.tsx
│   │   ├── FeaturePage.tsx
│   │   ├── Footer.page.tsx
│   │   ├── Hero.page.tsx
│   │   ├── HeroBackground.tsx
│   │   ├── Home.page.tsx
│   │   ├── MermaidSimulator.page.tsx
│   │   └── Navbar.page.tsx
│   ├── marketplace
│   │   ├── Marketplace.page.tsx
│   │   ├── asset
│   │   │   └── AssetDetails.page.tsx
│   │   └── auction
│   │       └── AuctionDetails.page.tsx
│   ├── portfolio
│   │   └── Portfolio.page.tsx
│   ├── public
│   │   ├── auth
│   │   │   ├── Auth.page.tsx
│   │   │   └── adminAuth.page.tsx
│   │   └── onboarding
│   │       └── IssuerOnboarding.page.tsx
│   └── secondary-marketplace
│       └── TradingEngine.page.tsx
├── stores
│   ├── admin.store.ts
│   ├── auth.store.ts
│   ├── changelog.store.ts
│   ├── leverage.store.ts
│   ├── marketplace.store.ts
│   └── portfolio.store.ts
├── styles
│   ├── Navbar.css
│   ├── globals.css
│   └── heroBackground.css
├── types
│   ├── admin.types.ts
│   ├── auth.types.ts
│   ├── changelog.types.ts
│   ├── issuer.types.ts
│   ├── leverage.types.ts
│   ├── marketplace.types.ts
│   └── solvency.types.ts
└── utils
    ├── debounce.ts
    └── solvency
        ├── format-credit.util.ts
        ├── formatters.ts
        └── health-factor.util.ts
