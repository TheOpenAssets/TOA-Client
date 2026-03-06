# Creditcoin Credit System — Frontend Build Doc

Hackathon scope. Framework-agnostic spec. All data comes from the backend API. Nothing computed on the frontend.

---

## New API Endpoints to Consume

| Method | Endpoint | Used By |
|---|---|---|
| GET | `/credit-score/:wallet` | Credit Score Dashboard |
| GET | `/solvency/borrow-terms/:wallet` | Pre-Borrow Preview |
| POST | `/usc/submit-proof` | USC Proof Submission Form |
| GET | `/usc/events/:wallet` | Cross-Chain Event History |

---

## Component 1 — Credit Score Dashboard

**Where it lives**: New tab or panel on the user profile / portfolio page.

**What it shows**:

A score display in three parts:

- **Composite Score** — the main number (0–1000) displayed prominently with the tier label (EXCELLENT / GOOD / FAIR / POOR) and a color indicator (green/yellow/orange/red).
- **Layer 1 — Platform Score** — smaller text below, shows the platform-level score with a one-line explanation: "Based on your repayment history on this platform."
- **Layer 2 — Creditcoin Protocol Score** — shows the Substrate-sourced score with explanation: "Based on your verified on-chain lending history across the Creditcoin network."

**Data source**: `GET /credit-score/:wallet`

Response shape to expect:
```
{
  compositeScore: number,
  tier: "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  layer1Score: number,
  layer2Score: number,
  effectiveLTV: number,       // basis points e.g. 7500
  maxBorrowMultiplier: number
}
```

**Behaviour**: Load on page mount with wallet address from auth context. Show skeleton loader while fetching. If layer2Score is 0, show "No Creditcoin protocol history found" in that section rather than hiding it — the absence is informative.

---

## Component 2 — Pre-Borrow Terms Preview

**Where it lives**: Inside the existing borrow/deposit flow, before the confirmation step. This is a new step inserted between "enter borrow amount" and "confirm transaction."

**What it shows**:

A summary card with:
- "Your credit score: 820 (EXCELLENT)"
- "Applied LTV: 75% — you qualify for an enhanced rate"
- "Standard LTV for this collateral type: 70%"
- "Maximum you can borrow against this collateral: $X,XXX"

If the user's tier is GOOD (default LTV), the card shows "Standard terms apply" rather than hiding the card — makes the credit system visible even when there is no uplift.

**Data source**: `GET /solvency/borrow-terms/:wallet` called when the user lands on the borrow step, not on every keystroke.

**Behaviour**: Non-blocking — if the endpoint fails or times out, the existing hardcoded terms are shown as fallback and the flow continues. The preview is informational, not a gate.

---

## Component 3 — USC Proof Submission

**Where it lives**: New page or modal accessible from the credit score dashboard — "Verify Cross-Chain Activity" button.

**What it shows**:

A form with:
- **Source Chain** — dropdown: Ethereum, BSC, Bitcoin
- **Event Type** — dropdown: Repayment, Default, Stake
- **Score Delta** — number input (positive for repayment/stake, negative for default)
- **Transaction Hash** — text input (the tx on the source chain being proven)
- **Proof Data** — textarea for raw hex proof bytes (advanced users / demo paste)

Submit button calls `POST /usc/submit-proof`. On success, show: "Proof submitted. Verification transaction: [txHash with Creditcoin testnet explorer link]." On failure, show the error message from the API response.

**After submission**: Automatically re-fetch `GET /credit-score/:wallet` after 5 seconds to show the updated score. The delay accounts for block finality. Show a "Refreshing your score..." indicator.

**For hackathon demo specifically**: Pre-fill the form with a known valid proof scenario so judges can click through without needing to generate their own proof. The pre-fill can be toggled with a "Load demo proof" button that populates all fields.

---

## Component 4 — Cross-Chain Event History

**Where it lives**: Below the Credit Score Dashboard, as a collapsible section titled "Verified Cross-Chain Events."

**What it shows**:

A simple list of verified events, each row showing:
- Source chain icon (Ethereum/BSC/Bitcoin)
- Event type (Repayment / Default / Stake)
- Score impact (+80 / −200)
- Verification timestamp
- Creditcoin testnet explorer link for the verification tx hash

**Data source**: `GET /usc/events/:wallet`

If empty, show: "No cross-chain events verified yet. Submit a proof above to get started." This keeps the feature discoverable.

---

## Modifications to Existing Borrow Flow

### Existing borrow response now includes `creditBoost` field

After the borrow executes, the backend response includes:
```
{
  ...existing fields,
  creditBoost: {
    score: 820,
    tier: "EXCELLENT",
    appliedLTV: 7500,
    standardLTV: 7000
  }
}
```

Show this in the transaction success state: "Loan executed at 75% LTV based on your credit score of 820." If `appliedLTV === standardLTV`, show nothing extra — no need to mention it.

---

## State Management Notes

- Credit score is per-wallet and changes only when: a new borrow/repay happens, a USC proof is verified, or the cache TTL expires (10 min). No need to poll. Fetch once on page load, re-fetch after USC submission.
- Do not store the score in global state permanently — always re-fetch from the API as the source of truth.
- The borrow-terms endpoint should be called lazily (when the user enters the borrow flow) not eagerly on dashboard load.

---

## Explorer Link Format

For the hackathon demo, Creditcoin testnet transactions link to:
```
https://creditcoin-testnet.blockscout.com/tx/{txHash}
```

Use this anywhere a `txHash` from a Creditcoin network operation is shown.
