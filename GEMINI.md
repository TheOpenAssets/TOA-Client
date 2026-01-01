# GEMINI.md - Context & Instructions

This file provides context for the **Mantle TOA Client** project. It is intended to guide AI agents and developers in understanding the codebase, architecture, and established conventions.

## 1. Project Overview

**Mantle TOA Client** is a decentralized application (DApp) for **Real-World Asset (RWA) Auctions**. It enables issuers to list assets and investors to bid on them via Dutch or Fixed auctions.

### Tech Stack
-   **Framework:** React 19 + Vite + TypeScript
-   **Styling:** Tailwind CSS 4 + `clsx` + `tailwind-merge` + `tw-animate-css`
-   **UI Library:** Radix UI primitives + **Shadcn/UI** (Factory Pattern)
-   **State Management:** Zustand (Global State) + TanStack Query (Server State)
-   **Routing:** React Router DOM 7
-   **Blockchain:** Ethers v6, Viem, Wagmi, RainbowKit

## 2. Architecture & Patterns

The project follows a **Feature-Based Architecture** with a strong emphasis on the **Factory Pattern**.

### Core Principles
-   **Factories:** Use factory patterns for UI components (Shadcn), services, and hooks. Do not build ad-hoc components if a factory variant can be created.
-   **Feature Isolation:** Business logic resides in `features/` or specific `stores/`, while `pages/` are largely presentational glue.
-   **Service Layer:** API and Blockchain interactions are abstracted into services (`src/lib/api/`, `src/lib/blockchain/`).

### Directory Structure
```
src/
├── app/                  # App glue (Routing, Providers, Layouts, Guards)
├── components/           # UI Components (Shadcn Factories in ui/, Feature components)
├── features/             # Business logic (Marketplace, Issuer, Borrow, etc.)
├── hooks/                # Reusable hooks (Auth, Wallet, Toast)
├── lib/                  # Utilities, API clients, Blockchain services
├── pages/                # Route screens (Landing, App, Admin, Public)
├── stores/               # Zustand Global Stores (Auth, Market, Wallet, Portfolio)
├── types/                # TypeScript Interfaces (API, Market, Blockchain)
└── styles/               # Global CSS & Tailwind config
```

## 3. Critical Conventions

### 💰 WEI & Decimals (CRITICAL)
Blockchain values are returned in **WEI**. You **MUST** convert them for display and interaction.
-   **Tokens:** 18 Decimals (`val / 1e18`)
-   **USDC:** 6 Decimals (`val / 1e6`)
-   **Input:** Convert user input back to WEI before sending to contracts (`parseUnits(val, decimals)`).

### 📡 API Response Handling
-   **Nested Arrays:** API list endpoints often wrap data.
    -   *Wrong:* `response.json()` → `Array`
    -   *Correct:* `response.json()` → check `data.announcements` or `data.items`.
-   **Endpoints:** Verify endpoints against `docs/backend/API_REFERENCE.md` or existing services.
    -   Example: Listings are at `/marketplace/listings/:id`, not `/assets/:id`.

### 🎨 UI & Styling
-   **Shadcn/UI:** Use existing components in `components/ui/`.
-   **Icons:** Use `lucide-react` or `@tabler/icons-react`.
-   **Theme:** Respect the global theme (dark/light) via `tailwind.config.ts`.

## 4. Development & Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview build locally |

## 5. Recent Fixes & Status (Dec 2025)
-   **Auction Data:** Fixed API parsing to correctly handle nested `announcements`.
-   **Decimal Display:** Fixed massive numbers showing in UI by implementing correct WEI conversions.
-   **Bidding:** Fixed "Place Bid" flow to validate against parsed USDC values (e.g., $0.80 min, not 800,000).
-   **TypeScript:** Aligned `AssetDetails` and `Listing` types with actual API responses.

## 6. Key Documentation
-   `docs/directory.md`: Detailed architectural vision (Factories).
-   `docs/COMPLETE_FIX_SUMMARY.md`: Details on recent critical bug fixes.
-   `docs/backend/API_REFERENCE.md`: Backend API specs.
