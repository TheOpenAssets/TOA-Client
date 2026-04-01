

import MermaidSimulator from "./MermaidSimulator.page";
import Navbar from "./Navbar.page";
import FaqDetails from "../../components/ui/faq-details";

const mermaidCode = `flowchart TB
  %% BNB-SPECIFIC PLATFORM FLOW
  A[Landing Page | BNB-native firm vault platform]
  F[Faucet | Mint USDC + ankrBNB test tokens]
  M[Marketplace | Browse active firm vault listings]
  I[Issuer Onboarding | Submit and manage vault-backed assets]

  A --> F
  A --> M
  A --> I

  W[Wallet Connect | Authenticate with EVM wallet]
  M --> W
  F --> W

  %% INVESTOR FLOW
  D[Vault Details | Review terms, allocation, min investment]
  S[Standard Deposit | Deposit USDC into firm vault listing]
  L[Leverage Deposit | Use ankrBNB collateral via leverage vault]
  P[Portfolio | Track allocations, balances, and status]
  Y[Yield Claims | Claim distributable USDC from YieldVault]

  W --> D
  D --> S
  D --> L
  S --> P
  L --> P
  P --> Y

  %% ISSUER FLOW
  IP[Issuer Profile | Compliance + identity verified]
  AL[Asset Listing | Create and submit vault listing]
  AP[Admin Approval | Listing reviewed and activated]
  PM[Primary Market | Investors allocate capital]

  I --> IP
  IP --> AL
  AL --> AP
  AP --> PM
  PM --> D

  %% SECONDARY FLOW
  SM[Secondary Market | Trade existing tokenized positions]
  B1[Buy Orders | Acquire positions from other users]
  S1[Sell Orders | Exit or rebalance positions]

  P --> SM
  SM --> B1
  SM --> S1

  %% SETTLEMENT FEEDBACK
  ST[Settlement Recorded | On-chain lifecycle updates]
  N[Notifications | Real-time execution and settlement updates]

  PM --> ST
  Y --> ST
  ST --> N

  classDef entry fill:#f5f5f5,stroke:#555;
  classDef hub fill:#e3f2fd,stroke:#1565c0;
  classDef action fill:#e8f5e9,stroke:#2e7d32;
  classDef finance fill:#fff8e1,stroke:#f9a825;

  class A,F,M,I entry;
  class W,D,P,SM hub;
  class IP,AL,AP,PM,S,L,ST,N action;
  class Y,B1,S1 finance;
`;

const FAQSection = () => {

  return (
    <div className="max-w-screen">
      <Navbar />
      <section id="faqs" className="bg-white w-full px-5 flex flex-col gap-4">
        <div className="bg-neutral-200/40 rounded-4xl border border-neutral-200 mb-2 shadow-lg">
          <MermaidSimulator mermaidCode={mermaidCode} />
        </div>
        <div className="rounded-4xl border min-h-screen border-neutral-200 shadow-lg mb-1">
          <FaqDetails />
        </div>
      </section>
    </div>
  );
};

export default FAQSection;
