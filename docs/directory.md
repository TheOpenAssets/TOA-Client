src/
├── app/                                # App infrastructure (glue layer)
│   ├── router/                         # Central routing (React Router setup)
│   │   ├── index.tsx                   # Root router configuration
│   │   ├── public.routes.tsx           # Public routes (landing, marketplaces)
│   │   ├── app.routes.tsx              # Authenticated user routes
│   │   └── admin.routes.tsx            # Admin-only routes
│   │
│   ├── layouts/                        # Page shells (UI wrappers)
│   │   ├── LandingLayout.tsx           # Layout for marketing pages
│   │   ├── PublicLayout.tsx            # Layout for public product pages
│   │   ├── AppLayout.tsx               # Layout for logged-in users
│   │   ├── IssuerLayout.tsx            # Layout for issuer/originator
│   │   └── AdminLayout.tsx             # Layout for admin & ops
│   │
│   ├── guards/                         # Route protection logic
│   │   ├── AuthGuard.tsx               # Checks login/authentication
│   │   ├── WalletGuard.tsx             # Ensures wallet is connected
│   │   ├── RoleGuard.tsx               # Role-based access (investor/issuer/admin)
│   │   └── KycGuard.tsx                # KYC/compliance enforcement
│   │
│   └── providers/                      # Global providers (wrapped once)
│       ├── AppProviders.tsx            # Combines all providers
│       ├── QueryProvider.tsx           # React Query setup
│       ├── WalletProvider.tsx           # Wallet & chain context
│       └── ThemeProvider.tsx           # Theme / UI mode
│
├── pages/                              # Route-level screens (NO business logic)
│   ├── landing/                        # Marketing & SEO pages
│   │   ├── Home.page.tsx               # Landing home
│   │   ├── About.page.tsx              # About platform
│   │   ├── HowItWorks.page.tsx         # Product explanation
│   │   ├── Issuers.page.tsx            # Issuer-focused marketing
│   │   ├── Investors.page.tsx          # Investor-focused marketing 
│   │   └── Contact.page.tsx            # Contact / support
│   │
│   ├── public/                         # Public product access
│   │   ├── primary-marketplace/
│   │   │   └── PrimaryMarketplace.page.tsx   # Issuance / first sale
│   │   ├── secondary-marketplace/
│   │   │   └── SecondaryMarketplace.page.tsx # Trading / resale
│   │   └── verify/
│   │       └── Verify.page.tsx          # ZK / Engine F verification UI
│   │
│   ├── app/                            # Authenticated investor area
│   │   ├── borrow/
│   │   │   └── Borrow.page.tsx          # Borrow against assets
│   │   ├── portfolio/
│   │   │   └── Portfolio.page.tsx       # Holdings, yield, claims
│   │   └── asset/
│   │       └── AssetDetails.page.tsx    # Single asset details
│   │
│   ├── issuer/                         # Issuer / originator area
│   │   ├── dashboard/
│   │   │   └── IssuerDashboard.page.tsx # Issuer overview
│   │   ├── issue-asset/
│   │   │   └── IssueAsset.page.tsx      # Asset creation flow
│   │   ├── assets/
│   │   │   └── IssuerAssets.page.tsx    # Issuer-managed assets
│   │   └── compliance/
│   │       └── IssuerCompliance.page.tsx# Issuer compliance status
│   │
│   └── admin/                          # Admin & operations
│       ├── compliance/
│       │   └── ComplianceQueue.page.tsx# Review & approvals
│       └── ops/
│           └── OpsDashboard.page.tsx    # Platform operations
│
├── features/                           # Business logic by domain (core layer)
│   ├── marketplace/
│   │   ├── primary/                    # Primary issuance logic
│   │   └── secondary/                  # Secondary trading logic
│   │
│   ├── issuer/                         # Issuer-specific logic
│   ├── borrow/                         # Borrowing & collateral logic
│   ├── portfolio/                      # Portfolio aggregation logic
│   ├── verification/                   # ZK & verification logic
│   └── compliance/                     # Compliance rules & workflows
│
├── components/                         # Reusable UI components
│   ├── ui/                             # Design system (factory-based)
│   │   ├── button/                     # Buttons with variants
│   │   ├── toast/                      # Notifications
│   │   ├── modal/                      # Dialogs
│   │   ├── loader/                     # Loaders/spinners
│   │   └── empty-state/                # Empty & fallback UI
│   │
│   ├── landing/                        # Landing page sections
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Timeline.tsx
│   │   └── CTA.tsx
│   │
│   ├── wallet/                         # Wallet UI components
│   ├── charts/                         # Yield, APY, analytics charts
│   └── common/                         # Shared layout components
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Navbar.tsx
│
├── lib/                                # Low-level system utilities
│   ├── blockchain/                     # Blockchain setup & contracts
│   ├── api/                            # API client & hooks
│   ├── crypto/                         # Hashing & ZK helpers
│   └── utils/                          # Formatters, env, logger
│
├── stores/                             # Global state (Zustand)
│   ├── auth.store.ts                   # Auth & session state
│   ├── wallet.store.ts                 # Wallet & chain state
│   ├── market.store.ts                 # Marketplace filters/state
│   ├── issuer.store.ts                 # Issuer state
│   └── portfolio.store.ts              # Portfolio state
│
├── hooks/                              # Shared cross-feature hooks
│   ├── useAuth.ts                      # Auth access hook
│   ├── useWallet.ts                    # Wallet access hook
│   └── usePermissions.ts               # Role & permission logic
│
├── types/                              # Shared TypeScript types
│   ├── api.types.ts                    # API response/request types
│   ├── market.types.ts                 # Marketplace types
│   ├── issuer.types.ts                 # Issuer types
│   └── blockchain.types.ts             # Blockchain types
│
├── styles/                             # Global styles
│   ├── globals.css                     # Global CSS
│   └── tailwind.css                    # Tailwind entry
│
├── main.tsx                            # Vite entry point
└── env.d.ts                            # Environment type declarations



This plan builds on the previous version, with a strong focus on incorporating factories throughout the development process. Factories are a critical design pattern in modern frontend architecture, particularly for production-grade applications like the Open Assets project. They promote reusability, consistency, scalability, and maintainability by abstracting the creation of components or objects, allowing for centralized customization and variant management. In React, factories often manifest as higher-order components (HOCs), hooks, or library-generated builders (e.g., Shadcn/UI's component generation system). This aligns with OOP standards (e.g., Factory Method pattern from Gang of Four design patterns), where factories encapsulate instantiation logic, making the codebase extensible without modifying existing code (Open-Closed Principle).
Why do we need factories extensively?

Consistency and DRY (Don't Repeat Yourself): Factories ensure that UI elements like buttons or modals look and behave the same across the app. Instead of duplicating styles or props in every usage, a factory generates instances with predefined themes, variants, and behaviors.
Customization and Theming: Using factories allows easy global theming (e.g., via Tailwind or CSS variables). For example, a Button factory can produce primary, secondary, or destructive variants without boilerplate.
Performance and Optimization: Factories can incorporate memoization or lazy loading, reducing re-renders. They also facilitate accessibility features (e.g., ARIA attributes) in one place.
Scalability for Production: In industry standards (e.g., as seen in apps built by Meta, Airbnb, or Vercel), factories handle complexity as the app grows—adding new variants (e.g., a loading state for buttons) doesn't require refactoring every component usage.
Testing and Maintenance: Isolated factory logic is easier to unit test. If a bug arises in toasts, fix it in the factory, and it propagates everywhere.
Integration with Libraries: Shadcn/UI is essentially a factory system—it generates customizable components on-demand, integrating with Radix UI primitives for headless, accessible bases. This is superior to off-the-shelf libraries like Material-UI, as it gives full control without vendor lock-in.
Beyond UI: Extend factories to services (e.g., a QueryFactory for React Query hooks) or utilities (e.g., a FormatterFactory for locale-specific formatting), ensuring the entire app follows factory-driven abstraction.
Industry Best Practices: Factories are standard in enterprise React apps (e.g., via Mantlebook for component isolation, or Tanstack's virtualizers for list factories). They reduce technical debt, speed up onboarding for developers, and align with micro-frontend architectures if the project scales.

In this plan, factories will be mandated in key areas: UI components (via Shadcn), services (for API/blockchain abstractions), hooks (composable factories), and more. We'll generate them early to bootstrap features. If new factories are needed (e.g., for forms or errors), they'll be added iteratively.
The folder structure remains as before, with factories primarily in components/ui/ for UI, and extended to lib/services/ for service factories if abstraction grows.
Phase 1: Core Setup

Install dependencies, configure Vite, create folder structure, set up routing, Providers.tsx, and Layout.tsx as before.
Introduce a base FactoryProvider if needed (e.g., a context for injecting factory configs), but start minimal.
Emphasis on Factories: Even in setup, plan for factory integration by installing Shadcn/UI early. This phase ensures the foundation supports factory generation without conflicts.

Phase 2: UI Factory and Base Components
This phase is factory-heavy, as UI factories form the building blocks for the entire app.

Initialize Shadcn: Run npx shadcn-ui@latest init to set up the factory system, configuring themes (e.g., light/dark modes) in tailwind.config.js and components.json.
Generate Core UI Factories: Use Shadcn's CLI to create factories for essential elements. This isn't just copying components—Shadcn acts as a factory generator, producing TypeScript files with composable parts (e.g., Button.tsx with ButtonLoading variant).
Button Factory: Generate with npx shadcn-ui@latest add button. This creates a versatile factory supporting variants (default, outline, ghost), sizes, and states (disabled, loading). Why needed? Buttons appear in forms, nav, actions across originator/investor/admin—factory ensures uniform UX, e.g., all submit buttons have a loading spinner.
Toast Factory: Generate with npx shadcn-ui@latest add toast. Includes Toaster provider for global notifications. Essential for feedback (e.g., "Asset uploaded successfully"). Factory allows custom variants (success, error, info) with durations and positions.
Loader Factory: Generate with npx shadcn-ui@latest add skeleton or custom Loader.tsx. For loading states (spinners, skeletons). Why crucial? During API calls or blockchain txs, loaders prevent blank screens—factory variants for full-page vs. inline.
Modal Factory: Generate with npx shadcn-ui@latest add dialog. For popups (e.g., confirmation in verification). Factory supports headless mode for custom content, with animations and focus traps for a11y.
Additional UI Factories: Generate Card, Input, Table, Form (via npx shadcn-ui@latest add [component]). For Form, integrate with React Hook Form for validation—treat it as a form factory producing controlled inputs.

Build Specialized Components Using Factories: In components/wallet/, use Button factory for ConnectButton.tsx (e.g., <Button variant="wallet">Connect</Button>). In verification/, compose VerifierForm.tsx with Input and Modal factories. In charts/, while not pure factories, use Recharts' composable APIs as a charting factory.
Factory Standards: All generated factories must be exported as compounds (e.g., Modal.Root, Modal.Content). Customize in ui/ folder—add app-specific props (e.g., blockchain-themed colors). Ensure factories are theme-aware and responsive.
Why Extensive Factories Here? This phase establishes the factory pattern as the norm, preventing ad-hoc components later. It saves time in features phases, as 80% of UI will compose from these factories.

Phase 3: State Management, Hooks, and Utilities

Create stores, hooks, utilities, crypto lib, and types as before.
Emphasis on Factories: Introduce hook factories for composability. E.g., in hooks/, make useAsset.ts a factory function: const createAssetHook = (options) => { ... }; const useAsset = createAssetHook({});. This allows variants (e.g., for read-only vs. editable assets). For utilities, create a UtilsFactory in lib/utils/ exporting formatter creators (e.g., createCurrencyFormatter(locale)).
Why Needed? Hooks and utils often repeat logic—factories abstract this, aligning with functional programming's higher-order functions, which complement OOP in React.

Phase 4: Services Layer

Build APIService.ts and BlockchainService.ts as abstracted classes or factories.
Emphasis on Factories: Treat services as service factories. E.g., const createAPIService = (config: { baseURL: string }) => { return { getAssets: async () => { ... } }; }; const api = createAPIService({ baseURL: import.meta.env.VITE_API_URL });. This allows mocking for tests or env-specific variants (dev vs. prod). For BlockchainService, factory params include chainId, enabling multi-chain support.
Integrate with React Query: In lib/api/hooks/, create query factories like const assetQueryFactory = (params) => ({ queryKey: ['assets', params], queryFn: api.getAssets });.
Why Extensive Factories? Services handle critical calls (backend/contract)—factories ensure configurability, e.g., adding interceptors or logging without rewriting methods. This follows dependency injection, a core OOP standard.

Phase 5: Public Features

Build Marketplace and Verify features, integrating factories everywhere.
Emphasis on Factories: Use UI factories heavily—e.g., Marketplace table built with Table factory, filters with Input factory, notifications with Toast. For Verify, form composed from Form/Input/Modal factories, proofs displayed in Card factory.
Why Needed? Public features are user-facing; factories ensure polished, consistent UI, reducing bugs in high-traffic areas like marketplace searches.

Phase 6: Protected Features

Implement auth guards, Originator, Investor, and Admin features.
Emphasis on Factories: In Originator upload, use Loader factory for progress, Button for submit, Modal for confirmations. Investor portfolio uses Table/Card factories with Chart integrations. Admin queue leverages Table factory with pagination.
Why Needed? Protected features involve complex interactions (e.g., claims processing)—factories handle states (loading/error) uniformly, improving UX in sensitive areas like admin ops.

Phase 7: Integration and Polish

Wire blockchain/API, handle errors with Toast factory, add loaders globally.
Emphasis on Factories: Create an ErrorFactory for standardized error modals. Use factories for optimistic UI updates in mutations.
Why Needed? Integration ties everything—factories ensure seamless composition, e.g., a transaction flow using Button (loading) + Toast (success) + Modal (details).

Phase 8: Final Optimization and Build Readiness

Audit for factory usage: Ensure no non-factory UI slips in. Optimize factories (e.g., memoize Button).
Emphasis on Factories: Document factory extensions in README, e.g., how to add a new variant.
Why Needed? For production, factories make the app maintainable long-term, easing updates like theme changes.

This factory-centric plan ensures the Open Assets frontend is built to industry standards, robust, and extensible