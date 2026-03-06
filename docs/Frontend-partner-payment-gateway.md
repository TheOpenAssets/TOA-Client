# Partner Gateway — Frontend Developer Handover

**Feature:** Partner Protocol Borrowing (Demo: "Aave Demo" as mock partner)
**Network:** Creditcoin Testnet (chainId 102031)
**Explorer:** https://creditcoin-testnet.blockscout.com
**Backend base URL:** http://localhost:3005 (dev) / your deployed URL (prod)

> **TBD:** One contract address will be filled in after backend deploys the mock contract.
> Everything else below is finalized and ready to build against.

---

## What This Feature Is

Users who have deposited RWA collateral on our platform can borrow USDC through a partner
protocol (e.g. "Aave Demo"). Our platform handles all blockchain transactions on their behalf —
the user never signs anything on-chain for the borrow or repay. They just click buttons.

The partner is a real smart contract on Creditcoin testnet. Borrow and repay produce real
on-chain transactions visible on the explorer.

---

## Prerequisites — What the User Must Have Before They Can Use This

Before a user can do partner borrowing, they need:
1. Wallet connected + authenticated (JWT)
2. KYC completed
3. RWA token deposited as collateral → `solvencyPositionId` assigned
4. `oaidTokenId` issued (happens automatically on deposit)

If they do not have a solvency position, show: "Deposit collateral first to unlock partner borrowing."

Check this with:
```
GET /solvency/positions/my
Authorization: Bearer <jwt>
```
If the array is empty → user has no position → show deposit prompt instead.

---

## Auth

Every endpoint below (except health/public) requires:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

JWT is obtained from the existing login flow (`POST /auth/login`).

---

## Screen 1 — Partner List Page

**What it shows:** Available partner protocols the user can borrow through.
**Where it lives:** `/partners` or a tab within the user dashboard.

### Step 1 — Fetch the partner list

```
GET /admin/partners?status=ACTIVE
Authorization: Bearer <jwt>
```

> Note: This is the admin endpoint but readable by any authenticated user.
> Filter client-side to `status === 'ACTIVE'` partners.

**Response shape:**
```json
[
  {
    "partnerId": "uuid",
    "partnerName": "Aave Demo",
    "tier": "PREMIUM",
    "status": "ACTIVE",
    "contactEmail": "demo@aave-test.com"
  }
]
```

### Step 2 — Show the user's available credit per partner

For each partner, show how much the user can borrow. Fetch the user's borrow terms:

```
GET /credit-score/borrow-terms/:walletAddress
Authorization: Bearer <jwt>
```

**Response shape:**
```json
{
  "walletAddress": "0x815A...",
  "compositeScore": 720,
  "tier": "PREMIUM",
  "effectiveLtv": 8000,
  "standardLtv": 7000,
  "hasBoost": true,
  "maxBorrowableUsdc": "8000000000"
}
```

Use `effectiveLtv` and `maxBorrowableUsdc` to show:
> "Your credit score (720 · PREMIUM) qualifies you for 80% LTV.
> You can borrow up to **8,000 USDC** via Aave Demo."

If `hasBoost === true` → show a badge: "Credit Boost Active 🚀"

---

## Screen 2 — Borrow Via Partner

**Trigger:** User clicks "Borrow" on a partner card.
**What it shows:** Borrow amount input + credit summary + confirm button.

### The borrow call

```
POST /partners/gateway/borrow
Authorization: Bearer <jwt>

{
  "partnerId": "uuid-of-partner",
  "amount": "5000000000",
  "loanDuration": 2592000
}
```

**Field notes:**
- `amount` — USDC in 6-decimal format. 5000 USDC = `"5000000000"`. Show user a normal number input, multiply by 1,000,000 before sending.
- `loanDuration` — seconds. 30 days = 2592000. You can hardcode this for now or let user pick.
- `partnerId` — from the partner list response above.

**Success response:**
```json
{
  "success": true,
  "internalLoanId": "uuid",
  "partnerLoanId": "aave_xxxxxxxx",
  "partnerName": "Aave Demo",
  "principalAmount": "5000000000",
  "borrowTxHash": "0xabc...",
  "transferTxHash": "0xdef...",
  "recordTxHash": "0xghi...",
  "explorerLinks": {
    "borrow": "https://creditcoin-testnet.blockscout.com/tx/0xabc...",
    "transfer": "https://creditcoin-testnet.blockscout.com/tx/0xdef...",
    "record": "https://creditcoin-testnet.blockscout.com/tx/0xghi..."
  },
  "creditBoost": {
    "score": 720,
    "tier": "PREMIUM",
    "appliedLtv": 8000,
    "standardLtv": 7000,
    "boosted": true
  }
}
```

**On success — show the user:**
```
✅ Loan Disbursed

5,000 USDC borrowed via Aave Demo

Your credit score (PREMIUM · 720) gave you 80% LTV
(standard would be 70%)

On-chain transactions:
→ Borrow from SolvencyVault    [View on Explorer ↗]
→ USDC sent to Aave Demo       [View on Explorer ↗]
→ Loan recorded in Aave Demo   [View on Explorer ↗]
```

**Error states:**
- `400 Bad Request` with message `"Borrow amount exceeds credit limit"` → show: "Amount too high for your current credit. Max: X USDC"
- `400` with `"No active solvency position"` → show: "Deposit collateral first"
- Generic 500 → show: "Transaction failed. Please try again."

---

## Screen 3 — My Partner Loans

**What it shows:** All active and repaid partner loans for the user.
**Where it lives:** `/my/loans` or a tab within the dashboard.

```
GET /solvency/partner-loans/my
Authorization: Bearer <jwt>
```

**Response shape:**
```json
{
  "success": true,
  "count": 1,
  "loans": [
    {
      "internalLoanId": "uuid",
      "partnerLoanId": "aave_xxxxxxxx",
      "partnerName": "Aave Demo",
      "principalAmount": "5000000000",
      "remainingDebt": "5000000000",
      "totalRepaid": "0",
      "status": "ACTIVE",
      "borrowedAt": "2026-03-05T10:00:00.000Z",
      "borrowTxHash": "0xabc...",
      "repayTxHash": null,
      "creditBoost": { ... }
    }
  ]
}
```

**Display each loan as a card:**
```
Aave Demo                              [ACTIVE]
Borrowed:   5,000 USDC
Remaining:  5,000 USDC
Date:       Mar 5, 2026

[View Borrow Tx ↗]     [Repay Now →]
```

Convert amounts: divide by 1,000,000 to show human-readable USDC.
If `status === 'REPAID'` → show green badge, show repay tx link, hide "Repay Now" button.

---

## Screen 4 — Repay Partner Loan

**Trigger:** User clicks "Repay Now" on a loan card.
**What it shows:** Repayment confirmation + amount.

### The repay call

```
POST /partners/gateway/repay
Authorization: Bearer <jwt>

{
  "internalLoanId": "uuid-of-loan",
  "amount": "5000000000"
}
```

**Field notes:**
- `internalLoanId` — from the loan list response (NOT `partnerLoanId`)
- `amount` — full remaining debt for full repayment, or partial amount. Use `remainingDebt` from the loan list as the default.

**Success response:**
```json
{
  "success": true,
  "internalLoanId": "uuid",
  "partnerName": "Aave Demo",
  "repaymentAmount": "5000000000",
  "remainingDebt": "0",
  "status": "REPAID",
  "partnerRepayTxHash": "0xjkl...",
  "vaultRepayTxHash": "0xmno...",
  "explorerLinks": {
    "partnerRepay": "https://creditcoin-testnet.blockscout.com/tx/0xjkl...",
    "vaultRepay": "https://creditcoin-testnet.blockscout.com/tx/0xmno..."
  }
}
```

**On success — show the user:**
```
✅ Repayment Complete

5,000 USDC repaid to Aave Demo

On-chain transactions:
→ Repaid in Aave Demo contract    [View on Explorer ↗]
→ SolvencyVault settled           [View on Explorer ↗]

Your collateral is now available to withdraw.
```

---

## Contracts on Creditcoin Testnet

All verifiable at https://creditcoin-testnet.blockscout.com/address/<address>

| Contract | Address | Notes |
|----------|---------|-------|
| SolvencyVault | `0x77bB1944E2a2FC0e5D0F587699041ee09900ADA8` | Core collateral + borrow contract |
| MockUSDC | `0x32223cA0BDDb1c1fD68f21de3FF64C147F2B2fC1` | USDC token on Creditcoin testnet |
| OAID | `0x89C70bB202341c28e7a8dF333b4981BfB49b3c21` | On-chain credit identity |
| MockPartnerProtocol | **TBD — will be provided after deploy** | "Aave Demo" contract |

> The MockPartnerProtocol address is the only thing pending deployment.
> All other contracts are live and all endpoints above are ready to build against.

---

## Loading / Pending States

Borrow and repay are blockchain transactions — they take 5–15 seconds on Creditcoin testnet.

Show a loading state after the user confirms:
```
⏳ Processing on Creditcoin testnet...
This takes a few seconds — your transaction is being confirmed on-chain.
```

Do not auto-dismiss. Wait for the API response (it's synchronous — response only comes after all txs confirm).

---

## USDC Amount Formatting

All amounts in the API are in **6-decimal USDC format** (same as standard ERC-20 USDC).

```
Display → API:   userInput * 1_000_000        (e.g. 5000 → "5000000000")
API → Display:   apiValue / 1_000_000         (e.g. "5000000000" → 5000)
```

Always send amounts as strings, not numbers (they can exceed JS safe integer range).

---

## Explorer Link Pattern

Paste any tx hash or address into:
```
https://creditcoin-testnet.blockscout.com/tx/<txHash>
https://creditcoin-testnet.blockscout.com/address/<address>
```

Show these as small inline links next to transaction confirmations — not in a modal.
Label them: "View on Explorer ↗"

---

## What Is NOT Your Concern

- Gas fees — paid by platform wallet, user never pays gas
- Wallet signing for borrow/repay — platform executes on-chain, user just clicks
- USDC approval — handled server-side
- Credit score calculation — handled by backend, you just display what the API returns

---

## Summary of New API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/admin/partners?status=ACTIVE` | JWT | Get partner list |
| `GET` | `/credit-score/borrow-terms/:wallet` | JWT | Get credit score + max borrow |
| `GET` | `/solvency/positions/my` | JWT | Check if user has collateral |
| `POST` | `/partners/gateway/borrow` | JWT | Borrow via partner (new) |
| `POST` | `/partners/gateway/repay` | JWT | Repay partner loan (new) |
| `GET` | `/solvency/partner-loans/my` | JWT | List all user's partner loans |

The two endpoints marked **(new)** will be ready once backend deployment completes.
All other endpoints are live today.
