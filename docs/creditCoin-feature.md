                
  ---
  Creditcoin Credit System — Hackathon Feature Plan                   
   
  ---                                                                 
  Gap 2 — Creditcoin Protocol Score (Layer 2 Substrate Fetcher)

  What this is: Creditcoin's Substrate layer holds real loan records —
   Deals, Repayments, Defaults — for 337K+ wallets. We query these and
   generate a "protocol score" that reflects a user's broader credit
  history outside our platform.

  How it works:

  We create a CreditcoinSubstrateService inside the existing
  blockchain module. This service connects to Creditcoin's Substrate
  WebSocket RPC using @polkadot/api (standard Polkadot toolkit). When
  given a wallet address, it fetches that wallet's deal history and
  repayment records directly from the chain. From that raw data it
  computes a simple numerical score — deals completed, repayments
  made, defaults recorded — weighted into a 0 to 1000 number.

  The one tricky piece is address mapping: our users have EVM
  addresses but Creditcoin's Substrate layer uses SS58 format. The
  @polkadot/util-crypto library handles this conversion cleanly. On
  the testnet this works directly.

  For the hackathon, the score is cached in memory (or Redis if
  already wired) for 10 minutes per wallet to avoid hammering the RPC
  on every request.

  What's visible: A real call to the Creditcoin Substrate chain
  returning real data. If a test wallet has actual Creditcoin credit
  history (the protocol has 4.27M real records), the score reflects
  genuine on-chain data. We expose this as GET
  /credit-score/:wallet/protocol and the response shows raw deal
  count, repayment count, and the calculated protocol score. Visible
  and verifiable.

  ---
  Gap 3 — Composite Score Engine

  What this is: The single score a user sees that combines what they
  have done on our platform (Layer 1) with what they have done across
  the broader Creditcoin ecosystem (Layer 2). This score then directly
   drives what borrowing terms they get.

  How it works:

  We create a CreditScoreModule with one service. It has two inputs:
  the platform score (Layer 1) and the protocol score (Layer 2).

  The platform score (Layer 1) is already fully computable from our
  existing database — it reads the user's SolvencyPosition records:
  ratio of on-time installments, count of missed payments, whether
  they have ever defaulted, total USDC successfully repaid. This data
  exists today, it just has never been aggregated into a single
  number. We score it 0 to 1000.

  The protocol score (Layer 2) comes from the Substrate fetcher built
  in Gap 2.

  The composite is a weighted blend: 60% platform, 40% protocol. The
  reasoning is that our platform has more granular, recent behavioral
  data. But for new users who have never borrowed from us, the
  protocol score carries the full weight, so a real Creditcoin user
  arriving for the first time is not treated as a stranger.

  The composite score maps to four tiers that control LTV:

  - Excellent (800+) → 75% LTV, label shown to user
  - Good (600–800) → 70% LTV (current default, no change)
  - Fair (400–600) → 65% LTV
  - Poor (below 400) → 55% LTV

  We expose two endpoints: GET /credit-score/:wallet returns the full
  composite breakdown (platform score, protocol score, composite
  score, tier, applicable LTV), and GET /solvency/borrow-terms/:wallet
   returns exactly what terms this user qualifies for before they
  commit to a borrow.

  What's visible: A user can query their score and see in a single API
   response both layers contributing to their final number. Two users
  with identical collateral but different credit histories will
  receive different terms. This is demonstrable and the score
  breakdown is transparent.

  ---
  Gap 4 — USC Cross-Chain Proof Processor

  What this is: USC lets our Creditcoin contract verify that a
  specific transaction happened on another blockchain — like a
  repayment on Aave on Ethereum — without trusting anyone. We build
  the backend infrastructure to receive proof submissions and react to
   verified events by updating the user's credit score.

  How it works:

  This has three parts.

  Part A — The verifier contract on Creditcoin: We deploy a small
  USCCreditVerifier Solidity contract on the Creditcoin testnet. This
  contract has one function: receive a proof payload, call the 0x0FD2
  precompile with it, and if the proof validates, emit a
  CrossChainEventVerified event containing the user's wallet, the
  source chain (e.g. Ethereum), the event type (REPAYMENT, DEFAULT,
  STAKE), and a score delta value. The contract does nothing else. It
  does not store state. The precompile does the verification math.

  Part B — The backend proof submission API: We create a USCModule
  with a USCProofService. It exposes POST /usc/submit-proof which
  accepts the wallet address, source chain, event type, and the raw
  proof data. The service calls the USCCreditVerifier contract
  on-chain. The transaction either succeeds (proof valid, event
  emitted) or fails (proof invalid, transaction reverts). No
  ambiguity.

  Part C — The event listener and score update: Our existing
  truth-engine / block polling mechanism listens for
  CrossChainEventVerified events from the USCCreditVerifier contract.
  When one arrives, it updates that user's composite score in our
  database and optionally adjusts their OAID credit line on-chain
  through SolvencyVault.

  For the hackathon demo specifically: USC testnet v2 is live. We can
  generate a valid proof for a real Ethereum transaction using the USC
   prover tooling Creditcoin has published. For the demo we will
  prepare one or two pre-verified test scenarios (e.g. a specific
  wallet that repaid on Aave on Ethereum, proofed against the testnet)
   so that we can show the end-to-end flow live: proof submitted →
  on-chain verification via 0x0FD2 → score update visible in our API →
   better borrowing terms unlocked.

  What's visible: An actual Creditcoin testnet transaction calling the
   0x0FD2 precompile. The explorer shows the proof verification call.
  After it succeeds the user's credit score in our API changes. This
  is the most visually impressive part of the demo because it is
  literally cross-chain credit without any oracle, bridge, or
  middleman.

  ---
  Gap 5 — Credit-Aware Borrowing Terms

  What this is: The solvency borrow flow currently uses hardcoded LTV
  values (70% for RWA, 60% for private assets). This gap wires the
  composite score from Gap 3 into that flow so that better credit
  history actually produces better on-chain loan terms.

  How it works:

  Two changes to existing code, nothing structural:

  First, the GET /solvency/borrow-terms/:wallet endpoint (added as
  part of Gap 3's CreditScoreModule) returns the credit-adjusted LTV
  and maximum borrowable amount. The frontend shows this to the user
  before they initiate anything. This is the "preview" step — visible,
   informative, and demonstrable without executing anything.

  Second, when the user calls the existing borrow endpoint, the
  solvency service now calls
  CreditScoreService.getEffectiveLTV(walletAddress) before
  constructing the on-chain call. It passes the credit-adjusted LTV
  basis points into the SolvencyVault.borrowUSDC() call instead of the
   hardcoded value. The position recorded on-chain will reflect the
  credit-adjusted LTV. The response to the user includes a creditBoost
   field that says "your score of 820 qualified you for 75% LTV
  instead of standard 70%".

  For partner loans, the same check is added to the partner borrow
  flow — the OAID available credit is recalculated using the
  credit-adjusted LTV, so a user with a high composite score has more
  headroom on their OAID credit line.

  What's visible: Two wallets with identical collateral but different
  credit scores will produce different on-chain positions. The
  position's LTV recorded in SolvencyVault will differ. The difference
   is visible in the contract state and in the API response. For the
  hackathon demo, we show one wallet with no Creditcoin history
  getting standard 70% LTV, and a wallet with real Creditcoin protocol
   history getting 75% — same collateral, demonstrably better terms
  because of cross-chain credit identity.

  ---
  How the Four Gaps Connect in the Demo Flow

  The demo narrative is a single user journey:

  1. User arrives at our platform. We query their Creditcoin Substrate
   history (Gap 2). They have 12 completed deals on-chain from
  Creditcoin's real borrower data.
  2. Their composite score is computed (Gap 3): protocol score
  elevates their composite above 750 even though they are new to our
  platform. They qualify for 72% LTV instead of 70%.
  3. They deposit RWA collateral and see personalized terms before
  borrowing (Gap 5).
  4. Separately, we demonstrate a USC proof submission — their Aave
  repayment on Ethereum is verified on-chain via 0x0FD2 (Gap 4). Their
   score updates to 820. Their available credit increases. Visible in
  real-time on the Creditcoin testnet explorer.

  Each gap works and is visible independently. But together they tell
  the complete story the creditCoin.md document describes.