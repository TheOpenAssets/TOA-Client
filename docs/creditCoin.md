# RWA dApp on Creditcoin
### Architecture, Credit Infrastructure & Cross-Chain Credit Score
*A Developer-Facing Overview*

---

## 1. What Creditcoin Is Doing at the Protocol Level

Creditcoin is a Layer 1 blockchain built for one specific purpose: creating a permanent, tamper-proof record of real-world lending activity on-chain. It was not designed as a general smart contract platform first — it was designed to solve a very specific problem.

In most parts of the world, people repay loans reliably but never build a credit history because that history lives inside a private company's database. When they switch lenders, they start from zero. Creditcoin's answer is simple: put the loan record on a public blockchain where it belongs to nobody — and is readable by everybody.

> **What "Protocol-Level" Actually Means**
> Creditcoin stores loan primitives — Orders, Offers, Deals, and Repayments — directly at the blockchain protocol level. Not inside a smart contract. Not in a company database. These are native chain-level data types, the same way a token balance is native on Ethereum. Any application reading the chain can see a wallet's full lending history, regardless of which app originally created that history.

As of today, over **4.27 million real-world credit transactions** have been recorded on Creditcoin, representing more than **$80 million in loan value** across **337,000+ borrowers** — primarily in Africa and Southeast Asia. This is real data, not simulated.

Creditcoin runs on a hybrid architecture: it uses Substrate (the same framework as Polkadot) as its base, with a fully EVM-compatible layer on top. The credit history lives on the Substrate layer. Your Solidity smart contracts live on the EVM layer. This distinction is central to how your RWA dApp connects to protocol-level credit data.

---

## 2. Our RWA dApp — What We Are Building

### 2.1 The Marketplace

We are building an RWA marketplace on Creditcoin EVM that operates at two levels:

- **Primary Market** — Real-world assets (property deeds, invoice receivables, trade finance instruments) are tokenized and listed as RWA tokens for first issuance.
- **Trading Market** — RWA tokens are bought and sold between participants on a secondary marketplace, giving assets liquidity they would not have in the traditional world.

### 2.2 Borrowing USDC Against RWA Tokens

Beyond buying and selling, users can deposit their RWA tokens as collateral and borrow USDC against them. This is the lending layer of the platform.

> **How Borrowing Works**
> A user who holds tokenized invoice receivables worth $10,000 can lock them in our smart contract and borrow, say, $6,000 USDC — using their real-world asset as collateral, without selling it. The loan-to-value ratio, interest rate, and borrowing limit are all influenced by one additional variable: the user's credit score.

### 2.3 The Credit Score — Two Layers

The credit score that governs a user's borrowing terms is not a single number from a single source. It is composed of two layers:

**Layer 1 — Contract-Level Score (Our Platform)**
We track user behaviour within our own dApp: how many times they have borrowed, whether they repaid on time, whether they defaulted, and the quality of the RWA tokens they have deposited. This score lives in our Solidity contract's storage and reflects activity specific to our platform.

**Layer 2 — Protocol-Level Score (Creditcoin Chain)**
The Creditcoin Substrate chain holds the broader credit history of that wallet across all lenders and platforms that have ever recorded activity on Creditcoin. This is the universal credit profile — built from years of real lending data — that no single app controls.

When a user applies for a loan on our platform, our system reads both layers and computes a composite score. A user with a strong Creditcoin protocol score but who is new to our platform can still be offered fair terms — because we are looking at their real financial history, not just what they have done with us.

---

## 3. The Cross-Chain Vision — Where USC Comes In

### 3.1 The Problem It Solves

Our users will not only borrow from us. Some will also borrow from Aave on Ethereum, or use other lending protocols on other chains. If a user repays a loan on Aave, that repayment is a positive credit signal — but our Creditcoin contract has absolutely no way of seeing it. Today, every chain is an island.

This creates a broken situation: a user who has an excellent repayment history across multiple chains still looks like a stranger when they arrive at a new platform. The whole point of building on Creditcoin is to fix this — and the mechanism that makes it possible is the **Universal Smart Contract (USC)**.

### 3.2 What USC Is — Simply

> **USC in Plain Terms**
> USC is Creditcoin's system that lets a smart contract on Creditcoin mathematically verify that a specific transaction happened on another blockchain — without trusting any intermediary. Not a bridge. Not an oracle company. Just cryptographic proof that the event occurred, verified on-chain in the same transaction.

Here is how the three pieces work together:

- **Attestors** — Continuously watch Ethereum, Bitcoin, and other chains and build a cryptographic fingerprint of their complete transaction history.
- **Provers** — Generate a STARK proof that a specific transaction exists within that fingerprint, proving it happened without anyone having to trust the prover.
- **Your Contract** — Receives the proof and verifies it synchronously using a built-in precompile (address `0x0FD2`) baked into the Creditcoin EVM. If the math checks out, your contract acts on it immediately — in the same transaction, no async waiting.

### 3.3 How USC Powers Our RWA dApp Specifically

| User Action (On Any Chain) | What USC Does | Effect on Our Credit Score |
|---|---|---|
| User repays an Aave loan on Ethereum | Proves repayment event to our Creditcoin contract | Score improves — repayment is counted |
| User stakes RWA tokens on another Creditcoin app | Proves staking transaction on Creditcoin Substrate | Collateral quality recognised across platforms |
| User defaults on a partner platform on BSC | Proves default event cross-chain | Score penalised — risk reflected accurately |
| User has long borrow history on Compound | Proves track record on Ethereum | New user treated as experienced borrower |

> **The Fundamental Shift**
> Without USC: our credit score only reflects what happened on our platform. With USC: our credit score reflects a user's entire financial life across every chain they have ever used. This is the difference between a credit bureau that covers one city and one that covers the world.

---

## 4. The Partnership Model — Aave, Boring Protocol, Others

Our vision is not to be the only place users can borrow. We want the credit score we maintain on Creditcoin to become a universal financial identity that follows users across partner platforms.

### 4.1 How a Partnership Works

Take Aave as an example. A user can:

1. Deposit their RWA tokens on our primary marketplace and receive a credit identity on Creditcoin.
2. Take that credit identity and use it to borrow on Aave on Ethereum — with their Creditcoin credit score used to set favourable terms.
3. Repay on Aave. USC detects the repayment event on Ethereum and proves it to our Creditcoin contract.
4. Their Creditcoin credit score is updated to reflect the repayment — automatically, without any manual reporting, without trusting Aave to send us data.

### 4.2 Settlement Flow

| Step | What Happens | Technology |
|---|---|---|
| 1 | User stakes RWA token on partner platform (e.g. Boring Protocol) | EVM smart contract |
| 2 | User borrows against it and repays on partner chain | Partner chain transaction |
| 3 | Off-chain worker generates STARK proof of the repayment | USC Prover |
| 4 | Proof submitted to our USC contract on Creditcoin EVM | USC contract call |
| 5 | `0x0FD2` precompile verifies the proof synchronously | Creditcoin built-in precompile |
| 6 | Our business logic contract updates the user's credit score | Our Solidity contract |
| 7 | User's improved score is now available on Creditcoin protocol | Creditcoin Substrate layer |

This loop is entirely trustless. At no point does our platform rely on Aave or the partner protocol to report anything. **The on-chain proof is the report.**

---

## 5. Current State of Development

| Component | Status | Notes |
|---|---|---|
| Creditcoin EVM (Solidity contracts) | ✅ Live on Mainnet | Full EVM compatibility, deploy with Hardhat/Foundry |
| Protocol-level credit history (Substrate) | ✅ Live on Mainnet | Query via Credal API or direct Substrate RPC |
| Contract-level credit score (our dApp) | 🔧 We manage this | Solidity mapping, fed by on-platform activity |
| USC (Universal Smart Contracts) | 🟡 Testnet v2 Live | Mainnet expected soon; build against it now |
| Cross-chain score settlement | 🟡 Testnet Ready | Architect now, deploy when USC hits mainnet |
| Wormhole bridge (Ethereum / BSC) | ✅ Live | CTC cross-chain liquidity available today |

---

## 6. Why This Architecture Matters

There are many lending platforms and RWA marketplaces in DeFi. What makes this architecture meaningful is the combination of three things that do not exist together anywhere else right now:

**Real Data at the Protocol Layer**
Not synthetic, not simulated. 4.27 million actual loan records from real borrowers in real emerging markets — available to any application reading the Creditcoin chain.

**Credit-Aware RWA Collateral**
Most RWA platforms treat tokens as pure collateral. We factor in the owner's credit history when deciding their borrowing terms. The same asset is worth more as collateral in the hands of a proven borrower.

**Trustless Cross-Chain Credit Settlement**
Through USC, a repayment on Ethereum is as valid a credit signal as a repayment on Creditcoin. We are building a credit score that follows the person, not the platform.

> **The Bigger Picture**
> The long-term goal is for a user in Lagos or Jakarta to build a verifiable, portable, tamper-proof financial identity across every platform they use — and carry that identity with them anywhere in DeFi. Our RWA dApp on Creditcoin is a foundational piece of that infrastructure.

---

*This document is an internal developer-facing overview. Architecture details are subject to change as USC moves from testnet to mainnet.*