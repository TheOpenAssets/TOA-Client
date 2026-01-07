

import MermaidSimulator from "./MermaidSimulator.page";
import Navbar from "./Navbar.page";
import FaqDetails from "../../components/ui/faq-details";

const mermaidCode = `flowchart TB
    %% =========================
    %% ENTRY POINT
    %% =========================
    A[Landing Page | The main entry point for all protocol users.]
    F[Faucet | Request test tokens to interact with the platform.]
    M[Explore Marketplace | Browse available Real World Asset (RWA) listings.]
    G[Get Started | Begin the onboarding and wallet connection process.]
    I[Become an Issuer | Apply to tokenize and list your own assets.]

    A --> F
    A --> M
    A --> G
    A --> I

    %% =========================
    %% AUTH & ROLE GATING
    %% =========================
    AU[Wallet Authentication | Securely connect your Web3 wallet to the protocol.]
    RS[Role Selection | Choose between Investor or Issuer permissions.]
    
    G --> AU
    M --> AU

    AU -->|New Wallet| RS
    AU -->|Returning Wallet| MP[Marketplace | Access the primary RWA listing directory.]

    RS --> INV[Register as Investor | Complete registration to browse and buy assets.]
    RS --> ISS[Register as Issuer | Complete registration to manage and list assets.]

    %% Role immutability logic
    ISS -->|Check| BLOCK1[Role Switch Blocked | Users cannot change roles once registered.]
    INV -->|Check| BLOCK2[Role Switch Blocked | Users cannot change roles once registered.]

    %% =========================
    %% ISSUER FLOW
    %% =========================
    I --> ISS
    IP[Issuer Profile Created | Your business identity is verified on-chain.]
    AS[Submit Assets | Provide documentation for asset tokenization.]
    TK[Tokenization | Assets are minted into fractional RWA tokens.]
    LIST[Asset Listed | Tokens are now live for trade on the Marketplace.]

    ISS --> IP
    IP --> AS
    AS --> TK
    TK --> LIST

    %% =========================
    %% INVESTOR FLOW
    %% =========================
    INV --> MP

    %% =========================
    %% MARKETPLACE HUB
    %% =========================
    H[Marketplace Hub | Central dashboard for discovery, trading, and borrowing.]
    MP --> H

    D[Asset Discovery | Explore asset classes and filtered listings.]
    P[Portfolio | Track your holdings, yield, and active positions.]
    T[Trade | Buy and sell RWA tokens on the secondary market.]
    B[Borrow | Use your RWA holdings as collateral for credit.]

    H --> D
    H --> P
    H --> T
    H --> B

    %% =========================
    %% ASSET DISCOVERY & AUCTION
    %% =========================
    AD[Asset Detail Page | View financials, legal docs, and buy modules.]
    AUCTION[Auction Listing | Participate in competitive bidding for new assets.]
    BID[Place Bid | Submit a USDC bid for the desired RWA amount.]
    AEND[Auction Ends | Finalize the price and distribute tokens.]
    REFUND[Bid Refunded | Capital returned if the bid was unsuccessful.]

    D -->|Fixed Price| AD
    D -->|Auction| AUCTION
    AUCTION --> BID
    BID --> AEND
    AEND -->|Successful| AD
    AEND -->|Failed| REFUND

    %% =========================
    %% BUY & LEVERAGE
    %% =========================
    BM[Buy Module | Configure purchase settings and payment type.]
    U[USDC Buy | Direct purchase using stablecoin collateral.]
    L[METH Buy | Leveraged purchase using protocol liquidity.]
    LC[Collateral Locked | METH is held in escrow to secure the position.]
    LP[Leverage Position | Active position with health factor tracking.]

    AD --> BM
    BM --> U
    BM --> L
    L --> LC
    LC --> LP

    %% =========================
    %% MAINTENANCE & LIQUIDATION
    %% =========================
    MAINT[Maintenance Loop | Continuous monitoring of collateral health.]
    HEALTH[Health Check | Automated oracle check for liquidation risk.]
    LIQ[Liquidation | Position closed to protect senior pool liquidity.]
    REPAY1[Senior Pool Repaid | Debt settled using liquidated collateral.]
    RELEASE1[RWA Released | Remaining assets returned to the user.]

    LP --> MAINT
    MAINT --> HEALTH
    HEALTH -->|Healthy| MAINT
    HEALTH -->|Breach| LIQ
    LIQ --> REPAY1
    REPAY1 --> RELEASE1

    %% =========================
    %% PORTFOLIO DETAILS
    %% =========================
    PA[Owned RWA | View your fractional real estate or credit tokens.]
    PB[Auction Bids | Monitor pending asset acquisitions.]
    PL[Leveraged Positions | Manage health and collateral for active buys.]
    LO[Active Loans | View borrowed amounts and repayment schedules.]
    PY[Yield & History | Track accrued earnings from asset performance.]
    CLAIM[Claim Yield | Withdraw earned USDC to your wallet.]
    WALLET[USDC Received | Yield successfully transferred to personal wallet.]

    P --> PA
    P --> PB
    P --> PL
    P --> LO
    P --> PY
    PY --> CLAIM
    CLAIM --> WALLET

    %% =========================
    %% SECONDARY MARKET
    %% =========================
    SM[Secondary Marketplace | peer-to-peer trading for existing RWAs.]
    BUY[Buy Tokens | Acquire existing tokens from other users.]
    SELL[Sell Tokens | List your holdings for exit liquidity.]
    YP[Yield Preserved | Yield accrual remains seamless during transfers.]

    T --> SM
    SM --> BUY
    SM --> SELL
    BUY --> YP
    SELL --> YP

    %% =========================
    %% BORROW & CREDIT
    %% =========================
    OA[OAID Activated | On-chain identity linked to credit scoring.]
    CR[Available Credit | View borrowing capacity based on RWA collateral.]
    AL[Active Loans | Track current debt and interest accrual.]
    BN[Native Borrow | Access capital via partner liquidity protocols.]
    PC[Private Credit | Peer-to-peer borrowing against specific assets.]
    LOAN[Loan Active | Funds deployed to user wallet with interest.]
    RESTORE[Credit Restored | Repayment completes and limit is refreshed.]
    ENFORCE[Enforcement | Settlement logic applied to defaulted loans.]
    REPAY2[Lender Paid | Capital returned to the senior pool.]
    EXCESS[Excess Returned | Remaining collateral sent back to user.]

    B --> OA
    OA --> CR
    OA --> AL
    CR --> BN
    CR --> PC
    BN --> LOAN
    LOAN -->|Repays| RESTORE
    LOAN -->|Default| ENFORCE
    ENFORCE --> REPAY2
    REPAY2 --> EXCESS

    %% =========================
    %% SYSTEM FEEDBACK
    %% =========================
    SETTLE[Matures | Asset lifecycle reaches the repayment phase.]
    RECORD[Recorded | Blockchain confirmation of asset settlement.]
    DIST[Yield Sent | Profits shared proportionally to token holders.]
    NOTIF[Notifications | Real-time alerts sent to user dashboard.]

    SETTLE --> RECORD
    RECORD --> DIST
    DIST --> PY

    MAINT --> NOTIF
    AEND --> NOTIF
    DIST --> NOTIF
    LIQ --> NOTIF
    RESTORE --> NOTIF

    %% =========================
    %% CLASS ASSIGNMENTS
    %% =========================
    classDef entry fill:#f5f5f5,stroke:#555;
    classDef hub fill:#e3f2fd,stroke:#1565c0;
    classDef action fill:#e8f5e9,stroke:#2e7d32;
    classDef finance fill:#fff8e1,stroke:#f9a825;

    class A,F,M,G,I entry;
    class MP,H,D,P,T,B,SM hub;
    class AU,RS,INV,ISS,IP,AS,TK,LIST,BID,AEND,MAINT,HEALTH,NOTIF action;
    class AD,BM,U,L,LC,LP,LIQ,REPAY1,RELEASE1,PA,PB,PL,LO,PY,CLAIM,WALLET,BUY,SELL,YP finance;
    class OA,CR,AL,BN,PC,LOAN,RESTORE,ENFORCE,REPAY2,EXCESS,SETTLE,RECORD,DIST finance;
`;

const FAQSection = () => {

  return (
    <div className="max-w-screen">
      <Navbar />
      <section id="faqs" className="bg-white w-full px-5 flex flex-col gap-4">
        <div className="bg-neutral-200/40 rounded-4xl border border-neutral-200 mb-2 shadow-lg">
          <MermaidSimulator mermaidCode={mermaidCode} />
        </div>
        <div className="rounded-4xl border border-neutral-200 shadow-lg mb-1">
          <FaqDetails />
        </div>
      </section>
    </div>
  );
};

export default FAQSection;
