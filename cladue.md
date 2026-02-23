# CLAUDE.md — OpenAssets Frontend

## Project Overview

**OpenAssets** is a production-grade RWA platform. It supports a dual-network architecture (**arbitrum** and **Stellar**) to tokenize, trade, and borrow against real-world assets. The frontend follows a strict **Feature-Based Module** architecture.

## Tech Stack

* **Framework:** React 19.2 + Vite 7.2 + TypeScript 5.9
* **Styling:** Tailwind CSS 4 (Evolutionary v4 syntax) + Framer Motion 12
* **State:** Zustand 5 (Global/Deep) + TanStack React Query 5 (Server/Async)
* **Web3:** RainbowKit 2 / Wagmi 2 (EVM) + Stellar SDK/Freighter (Stellar)
* **Visuals:** ECharts 6 + React Three Fiber 9

---

## ✅ STRICT Implementation Rules

### 1. Feature Module Structure (The Law)

Each feature (e.g., `marketplace`, `borrow`, `portfolio`) MUST follow this structure. **Do not deviate.**

```
src/pages/feature-name/
├── components/
│   ├── featureUI/         # 🟢 Pure UI (Presentation only, NO logic)
│   └── featureService/    # 🔵 Logic (Hooks, data fetching, state bridges)
├── hooks/                 # Feature-specific hooks
├── types/                 # Feature-specific types
├── stores/                # Zustand stores (if feature-specific)
└── context.md             # ⚠️ MANDATORY: Single source of truth

```

### 2. Documentation & State

* **ONE `context.md` PER FEATURE:** Updated with every change. NO `docs/` folders inside features.
* **Zustand:** Use for deep state or state shared across disparate features.
* **Props:** Use for simple 2-level parent-child data passing.
* **Service Layer (`src/lib/api/`):** All external calls must use the class-based services extending `BaseService`.

### 3. Logic/UI Separation

* **UI Components:** Accept props, return JSX. No `useEffect` for data fetching. No direct API calls.
* **Service Components:** Wrap UI components, handle hooks, and pass data down via props.

### 4. Shared Factories

* **NEVER** create custom buttons, modals, or loaders.
* Use the shared primitives in `src/components/ui/` (Radix wrappers).

---

## Design System & UI Conventions

### Responsive Layout (Tailwind v4)

* **Mobile-First:** Design for mobile, enhance for `md:`, `lg:`.
* **Spacing:** Use rem-based scales (`p-4`, `gap-6`). 1rem = 16px.
* **Fluid Typography:** Use `clamp()` for hero text or the following scale:
* Hero: `text-4xl md:text-6xl lg:text-[5.25rem]`
* H1: `text-3xl md:text-4xl lg:text-5xl`
* Body: `text-base md:text-lg`



### Color Palette & Visuals

* **EVM Context:** Primary branding aligned with arbitrum/Web3.
* **Transitions:** `transition-all duration-200 ease-in-out` on all interactive elements.
* **Feedback:** Every blockchain TX must trigger a Toast via `useToast`.

---

## Architecture Overview

### Multi-Network Routing

The app mounts under `/:network/`. Feature availability is gated by:

```tsx
<FeatureGuard feature="leverage">
  <LeverageComponent />
</FeatureGuard>

```

Configuration is managed in `src/lib/network/network.config.ts`.

### Authentication Flow

1. **Connect:** RainbowKit (EVM) or Stellar Wallet.
2. **Challenge:** Backend nonce signing.
3. **JWT:** Scoped to network (`arbitrum_access_token` vs `stellar_access_token`).
4. **Interceptors:** `BaseService` attaches tokens automatically.

---

## Path Aliases

* `@/*` maps to `src/` (e.g., `import { Service } from '@/lib/api/auth.service'`).

### RULES 

## Rule of plans

Plans should be human readable high level docs containing all the nitty gritties about how the work will be done but not the code, no pointers. Be as expressive as u can while planning but with words not with code .

## Rule of Package Manager

Our package  wil be mantained by the yarn intrinsically

## Rule of build 

Anyone is not allowed to run build .

## Rule of paths

PAths shall now look like ../../../service 
but shall look like @/src/module/service for clear readability This will enhance our code readability a lot.

## Rule of API logging 

Every route shall be documented by swagger response , payload and everything