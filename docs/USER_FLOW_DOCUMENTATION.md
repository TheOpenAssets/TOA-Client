# Complete User Flow Documentation
## Solvency Vault Borrow & Repay System

**Last Updated:** 2026-01-08
**Implementation:** ✅ Complete & Production Ready

---

## Table of Contents
1. [Investor Flows](#investor-flows)
   - [Deposit Collateral](#1-deposit-collateral-create-credit)
   - [Borrow USDC](#2-borrow-usdc-consume-credit)
   - [Repay Loan](#3-repay-loan)
   - [View Loan Details](#4-view-loan-details)
2. [Admin Flows](#admin-flows)
   - [Monitor Positions](#1-monitor-positions)
   - [Mark Missed Payment](#2-mark-missed-payment)
   - [Mark Defaulted](#3-mark-defaulted)
   - [Liquidate Position](#4-liquidate-position)
3. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Investor Flows

### 1. Deposit Collateral (Create Credit)

**Purpose:** Investor deposits RWA tokens to create credit line for borrowing

**User Location:** Portfolio → My Assets → Deposit Collateral Modal

**Step-by-Step Flow:**

#### What User Sees:
1. **Portfolio Page** - User navigates to Portfolio page
   - Sees "My Assets" table showing their RWA token holdings
   - Each asset shows: Token Symbol, Amount, USD Value, Maturity Date
   - "Deposit as Collateral" button available for each asset

2. **User Clicks "Deposit as Collateral"**
   - DepositCollateralModal opens
   - Shows selected asset details:
     - Token Symbol (e.g., "wETH")
     - Available Balance (e.g., "100.00 wETH")
     - Current USD Value (e.g., "$85,000.00")
     - Est. Credit Limit: $59,500 (70% LTV for RWA)

3. **User Enters Amount**
   - Input field for collateral amount
   - Real-time validation:
     - ❌ Amount > available balance → "Insufficient balance"
     - ❌ Amount = 0 → "Enter valid amount"
     - ✅ Valid amount → Shows projected credit limit

4. **User Clicks "Deposit Collateral"**
   - MetaMask popup #1: **Approve Token**
     - Message: "Allow SolvencyVault to spend wETH"
     - User clicks "Confirm"
     - Loading state: "Approving token..."

5. **Approval Success**
   - MetaMask popup #2: **Deposit Collateral**
     - Message: "Deposit 100 wETH as collateral"
     - User clicks "Confirm"
     - Loading state: "Depositing collateral..."

6. **Deposit Transaction Confirmed**
   - Loading state: "Syncing with backend..."
   - Backend API called: `POST /solvency/sync-position`
   - Backend reads blockchain and updates MongoDB

7. **Success Screen**
   - ✅ "Collateral Deposited Successfully!"
   - Shows:
     - Position ID: #5
     - Collateral Deposited: 100.00 wETH
     - USD Value: $85,000.00
     - Credit Limit Created: $59,500.00
     - Available to Borrow: $59,500.00
   - Button: "Go to Borrow Page"

8. **Page Refresh**
   - Portfolio updates automatically
   - User now sees position in "My Loans" section
   - "My Credit" widget shows: $59,500 available

**Technical Flow:**
```
User Action: Click "Deposit"
  ↓
Wallet Transaction #1: approve(SolvencyVault, amount)
  ↓
Wallet Transaction #2: depositCollateral(token, amount, valueUSD, tokenType, true)
  ↓
Blockchain Event: PositionCreated(positionId, user, token, amount, value, type)
  ↓
Backend API: POST /solvency/sync-position
  ↓
Backend: Reads blockchain → Updates MongoDB → Creates OAID credit line
  ↓
UI: Refreshes → Shows success → Updates credit display
```

**Edge Cases:**
- ❌ Token not approved → Shows "Please approve token first"
- ❌ Insufficient balance → Button disabled
- ❌ Transaction rejected → Shows error, can retry
- ❌ Sync fails → Events will auto-sync within 5-10 seconds

---

### 2. Borrow USDC (Consume Credit)

**Purpose:** Investor borrows USDC against deposited collateral

**User Location:** Borrow Page → Borrow Now Modal

**Step-by-Step Flow:**

#### What User Sees:
1. **Borrow Page** - User navigates to Borrow page
   - If credit = 0:
     - ❌ "No Available Credit"
     - Message: "Deposit collateral in Portfolio to create credit"
     - Button disabled

   - If credit > 0:
     - ✅ Shows available credit: "$59,500.00"
     - "Borrow Now" button enabled

2. **User Clicks "Borrow Now"**
   - UnifiedBorrowModal opens
   - Shows:
     - Available to Borrow: $59,500.00 (large, centered)
     - "Borrow Against Position" dropdown
     - Amount input field
     - Number of Installments selector (6 or 12)

3. **User Selects Position**
   - Dropdown shows all positions with available credit:
     - "Position #5 (wETH) - $85,000.00 Collateral"
   - User selects position

4. **User Enters Borrow Amount**
   - Input: "50000" (wants to borrow $50,000)
   - Real-time validation:
     - ❌ Amount > available credit → "Amount exceeds available credit"
     - ❌ Amount would drop health < 110% → "Health factor too low"
     - ✅ Valid amount → Button enabled

5. **User Selects Installments**
   - Dropdown: "6 Installments" or "12 Installments"
   - User selects: "12 Installments"
   - Shows: "Choose how many payments over the loan period"

6. **User Clicks "Borrow Now"**
   - Loading: "Fetching asset maturity date..."
   - Backend fetches: `GET /assets/token/:tokenAddress`
   - Calculates loan duration from maturity date

7. **MetaMask Popup: Borrow Transaction**
   - Message: "Borrow 50,000 USDC"
   - Shows gas fee
   - User clicks "Confirm"
   - Loading state: "Borrowing USDC..."

8. **Transaction Confirmed**
   - Loading state: "Syncing with backend..."
   - Backend API called: `POST /solvency/sync-position`
   - Backend updates MongoDB with loan details

9. **Success Screen**
   - ✅ "USDC Borrowed Successfully!"
   - Shows:
     - Amount Borrowed: $50,000.00 USDC
     - Loan Duration: 24 days
     - Installments: 12
     - First Payment Due: Jan 12, 2026
     - Installment Amount: $4,166.67
   - USDC appears in wallet
   - Modal closes automatically

10. **Page Refresh**
    - Available Credit updated: $9,500.00 (was $59,500)
    - Can borrow again up to remaining credit

**Technical Flow:**
```
User Action: Click "Borrow Now"
  ↓
Backend API: GET /assets/token/:tokenAddress (get maturity date)
  ↓
Frontend: Calculate loanDuration = asset.dueDate - now
  ↓
Wallet Transaction: borrowUSDC(positionId, amount, loanDuration, 12)
  ↓
Blockchain Events:
  - USDCBorrowed(positionId, amount, totalDebt)
  - RepaymentPlanCreated(positionId, duration, installments, interval)
  ↓
Backend API: POST /solvency/sync-position
  ↓
Backend: Reads blockchain → Updates MongoDB → Creates repayment schedule
  ↓
UI: Shows success → USDC in wallet
```

**Edge Cases:**
- ❌ No credit available → Can't access modal
- ❌ Asset matured → "Asset has matured, cannot borrow"
- ❌ Amount too high → Button disabled
- ❌ Transaction rejected → Shows error, can retry
- ✅ Can borrow multiple times up to available credit

---

### 3. Repay Loan

**Purpose:** Investor repays loan installments

**User Location:** Portfolio → My Loans → Repay Button

**Step-by-Step Flow:**

#### What User Sees:
1. **Portfolio Page** - My Loans Section
   - Table shows all loan positions:
     - Position #5 | wETH | $85,000 Collateral
     - Borrowed: $50,000 | Outstanding: $50,041.10
     - Health: 170% (Healthy, green)
     - Next Payment: $4,166.67 due Jan 12
     - "Repay" button

2. **User Clicks "Repay"**
   - RepayLoanModal opens
   - Shows:
     - Position #5 (wETH)
     - Outstanding Debt: $50,041.10
     - Next installment: $4,166.67 (if overdue, shows RED)
     - Amount input (pre-filled with next installment)
     - Quick buttons: "Next Payment" | "Half" | "Full Amount"

3. **User Chooses Amount**
   - Option A: Keeps pre-filled $4,166.67 (next installment)
   - Option B: Clicks "Half" → $25,020.55
   - Option C: Clicks "Full Amount" → $50,041.10
   - Real-time validation:
     - ❌ Amount > outstanding debt → "Exceeds debt"
     - ✅ Valid amount → Button enabled

4. **User Clicks "Repay $4,166.67"**
   - MetaMask Popup #1: **Approve USDC**
     - Message: "Allow SeniorPool to spend 4,166.67 USDC"
     - User clicks "Confirm"
     - Loading state: "Approving USDC..."

5. **Approval Success**
   - MetaMask Popup #2: **Repay Loan**
     - Message: "Repay 4,166.67 USDC"
     - Shows gas fee
     - User clicks "Confirm"
     - Loading state: "Processing repayment..."

6. **Transaction Confirmed**
   - Loading state: "Syncing with backend..."
   - Backend API called: `POST /solvency/sync-position`
   - Backend updates repayment schedule

7. **Success Screen**
   - ✅ "Repayment Successful!"
   - Shows:
     - Amount Paid: $4,166.67
     - Remaining Debt: $45,874.43
     - Installments Paid: 1 of 12
     - Next Payment: $4,166.67 due Jan 16
   - Modal closes after 1.5 seconds

8. **Page Refresh**
   - My Loans table updates:
     - Outstanding Debt: $45,874.43 (decreased)
     - Health Factor: 190% (improved)
     - Installment 1 marked PAID (green background)

**Technical Flow:**
```
User Action: Click "Repay"
  ↓
Wallet Transaction #1: approve(SeniorPool, amount)
  ↓
Wallet Transaction #2: seniorPool.repayLoan(positionId, amount)
  ↓
Blockchain Event: LoanRepaid(positionId, amountPaid, principal, interest, remainingDebt)
  ↓
Backend API: POST /solvency/sync-position
  ↓
Backend: Reads blockchain → Updates MongoDB → Marks installment PAID
  ↓
UI: Shows success → Updates debt → Updates schedule
```

**Edge Cases:**
- ❌ Insufficient USDC → "Insufficient USDC balance"
- ❌ Amount = 0 → Button disabled
- ❌ Transaction rejected → Can retry
- ✅ Can overpay (pays more than installment)
- ✅ Can pay full amount at once

---

### 4. View Loan Details

**Purpose:** Investor views detailed loan schedule

**User Location:** Portfolio → My Loans → Click Row

**Step-by-Step Flow:**

#### What User Sees:
1. **My Loans Table** - Collapsed View
   - Shows position summary in row
   - Chevron icon on left

2. **User Clicks Row**
   - Row expands with animation
   - Shows "Repayment Schedule" section
   - Loading: "Loading schedule..."

3. **Schedule Loaded**
   - Table shows all installments:
     ```
     #  Due Date        Amount      Status
     1  Jan 12, 2026   $4,166.67   PAID ✓ (green)
     2  Jan 16, 2026   $4,166.67   PENDING (white)
     3  Jan 20, 2026   $4,166.67   PENDING (white)
     ...
     12 Feb 01, 2026   $4,166.67   PENDING (white)
     ```

4. **User Clicks Row Again**
   - Schedule collapses
   - Returns to summary view

**Edge Cases:**
- ❌ No schedule (never borrowed) → Shows "No active loan"
- ❌ API error → Shows "Failed to load schedule"
- ✅ Overdue payments show in RED with "OVERDUE" badge

---

## Admin Flows

### 1. Monitor Positions

**Purpose:** Admin monitors all positions for health issues

**User Location:** Admin Dashboard → Solvency Positions

**Step-by-Step Flow:**

#### What User Sees:
1. **Admin Dashboard**
   - Table shows all active positions system-wide
   - Columns:
     - Position ID
     - User Address
     - Collateral (Symbol, Amount, Value)
     - Debt (Borrowed, Outstanding)
     - Health Factor (with color coding)
     - Status
     - Actions

2. **Health Factor Color Coding:**
   - 🟢 Green (> 120%): Healthy
   - 🟡 Yellow (110-120%): Warning
   - 🔴 Red (< 110%): Critical

3. **Filtering:**
   - "Show All" | "Healthy" | "At Risk" | "Critical"
   - Search by position ID or user address

**Edge Cases:**
- ✅ Positions auto-update every 30 seconds
- 🟡 Shows warning badge for upcoming due payments
- 🔴 Shows alert badge for missed payments

---

### 2. Mark Missed Payment

**Purpose:** Admin marks a payment as missed when investor doesn't pay on time

**User Location:** Admin Dashboard → Position Actions

**Step-by-Step Flow:**

#### What User Sees:
1. **Admin Sees Overdue Position**
   - Position #5 shows:
     - Next Payment Due: Jan 12 (3 days overdue)
     - Status: "OVERDUE" badge (red)
   - "Mark Missed" button available

2. **Admin Clicks "Mark Missed"**
   - Confirmation modal:
     - "Mark Payment as Missed?"
     - Position #5 - Installment #2
     - Due: Jan 12, Amount: $4,166.67
     - "This will increase missed payment count"
   - Buttons: "Cancel" | "Confirm"

3. **Admin Clicks "Confirm"**
   - Loading: "Marking payment as missed..."
   - Backend API: `POST /admin/solvency/position/5/mark-missed-payment`

4. **Success**
   - ✅ "Payment marked as missed"
   - Position updates:
     - Missed Payments: 1
     - Installment #2 status → MISSED (red)
   - Notification sent to investor

**Technical Flow:**
```
Admin Action: Click "Mark Missed"
  ↓
Backend API: POST /admin/solvency/position/:id/mark-missed-payment
  ↓
Backend: Updates MongoDB → Increments missedPayments
  ↓
Backend: Sends notification to investor
  ↓
UI: Updates position → Shows MISSED status
```

**Edge Cases:**
- ❌ Payment already marked → Shows "Already marked"
- ❌ Payment already paid → Button disabled
- ✅ Can mark multiple missed payments

---

### 3. Mark Defaulted

**Purpose:** Admin marks position as defaulted after 3+ missed payments

**User Location:** Admin Dashboard → Position Actions

**Step-by-Step Flow:**

#### What User Sees:
1. **Admin Sees Position with 3 Missed Payments**
   - Position #5:
     - Missed Payments: 3
     - Status: "AT RISK" (red)
   - "Mark Defaulted" button available

2. **Admin Clicks "Mark Defaulted"**
   - Confirmation modal:
     - "Mark Position as Defaulted?"
     - Position #5 - 3 missed payments
     - "This will trigger liquidation eligibility"
   - Buttons: "Cancel" | "Confirm"

3. **Admin Clicks "Confirm"**
   - Loading: "Marking as defaulted..."
   - Backend API: `POST /admin/solvency/position/5/mark-defaulted`

4. **Success**
   - ✅ "Position marked as defaulted"
   - Position status → DEFAULTED
   - Position now eligible for liquidation

**Technical Flow:**
```
Admin Action: Click "Mark Defaulted"
  ↓
Backend API: POST /admin/solvency/position/:id/mark-defaulted
  ↓
Backend: Updates MongoDB → Sets isDefaulted=true
  ↓
Backend: Makes position liquidatable
  ↓
UI: Updates status → Shows DEFAULTED badge
```

**Edge Cases:**
- ❌ Less than 3 missed → Button disabled
- ❌ Already defaulted → Shows "Already defaulted"
- ✅ Investor can still repay to avoid liquidation

---

### 4. Liquidate Position

**Purpose:** Admin liquidates defaulted or unhealthy position

**User Location:** Admin Dashboard → Liquidate Action

**Step-by-Step Flow:**

#### What User Sees:
1. **Admin Sees Liquidatable Position**
   - Position #5:
     - Health Factor: 105% (red) OR
     - Status: DEFAULTED
   - "Liquidate" button enabled (red)

2. **Admin Clicks "Liquidate"**
   - Confirmation modal:
     - "Liquidate Position #5?"
     - Reason: Health < 110% / Defaulted
     - Collateral: 100 wETH ($85,000)
     - Outstanding Debt: $45,874.43
     - "Collateral will be seized"
   - Buttons: "Cancel" | "Confirm Liquidation"

3. **Admin Clicks "Confirm Liquidation"**
   - Loading: "Processing liquidation..."
   - Backend API: `POST /admin/solvency/liquidate/5`

4. **Success**
   - ✅ "Position liquidated successfully"
   - Position status → LIQUIDATED
   - Collateral seized by platform
   - Investor's credit line closed
   - Notification sent to investor

**Technical Flow:**
```
Admin Action: Click "Liquidate"
  ↓
Backend API: POST /admin/solvency/liquidate/:id
  ↓
Backend: Validates liquidation conditions
  ↓
Blockchain: Seizes collateral
  ↓
Backend: Updates MongoDB → Sets status=LIQUIDATED
  ↓
Backend: Sends notification to investor
  ↓
UI: Updates position → Shows LIQUIDATED status
```

**Edge Cases:**
- ❌ Health > 110% AND not defaulted → "Not eligible for liquidation"
- ❌ Already liquidated → Button disabled
- ✅ Partial liquidation not supported

---

## Edge Cases & Error Handling

### Deposit Collateral

| Scenario | What User Sees | System Behavior |
|----------|----------------|-----------------|
| Insufficient balance | Button disabled, "Insufficient balance" | Validation prevents deposit |
| Token not approved | MetaMask approval popup | Approval tx required first |
| Approval rejected | "Approval rejected. Try again." | Can retry approval |
| Deposit rejected | "Deposit rejected. Try again." | Can retry deposit |
| Sync fails | Success shown, "Syncing..." | Events auto-sync within 5-10s |
| Duplicate deposit | Both succeed | Creates 2 positions (valid) |

### Borrow USDC

| Scenario | What User Sees | System Behavior |
|----------|----------------|-----------------|
| No credit | "No Available Credit" message | Cannot access borrow modal |
| Amount > credit | Button disabled, error message | Validation prevents borrow |
| Asset matured | "Asset has matured" error | Cannot calculate loan duration |
| Asset API fails | "Failed to fetch asset details" | Shows error, can retry |
| Transaction rejected | "Borrow transaction failed" | Can retry borrow |
| Sync fails | Success shown, "Syncing..." | Events auto-sync within 5-10s |

### Repay Loan

| Scenario | What User Sees | System Behavior |
|----------|----------------|-----------------|
| Insufficient USDC | Button disabled, "Insufficient USDC" | Validation prevents repay |
| Amount > debt | Button disabled, error message | Validation prevents overpay |
| Approval rejected | "Approval rejected" | Can retry approval |
| Repay rejected | "Repayment failed" | Can retry repay |
| Overpayment | Accepts, applies to future | Extra goes to next installments |
| Sync fails | Success shown, "Syncing..." | Events auto-sync within 5-10s |

### Admin Operations

| Scenario | What User Sees | System Behavior |
|----------|----------------|-----------------|
| Already marked | "Already marked as missed" | Button disabled |
| Payment paid | Button disabled | Cannot mark paid payment |
| Less than 3 missed | Button disabled | Need 3+ for default |
| Health > 110% | "Not eligible for liquidation" | Cannot liquidate healthy |
| API timeout | "Request timeout. Try again." | Can retry after timeout |

---

## Summary

### ✅ Investor Journey
1. **Deposit** → Create credit (approve + deposit + sync)
2. **Borrow** → Get USDC (fetch asset + borrow + sync)
3. **View** → Check schedule (expand row)
4. **Repay** → Pay installments (approve + repay + sync)

### ✅ Admin Journey
1. **Monitor** → Watch positions
2. **Mark Missed** → Track overdue payments
3. **Mark Defaulted** → Flag risky positions (3+ missed)
4. **Liquidate** → Seize collateral (if health < 110% or defaulted)

### ✅ Key Technical Patterns
- **Direct Wallet Transactions:** All investor operations
- **Automatic Sync:** Events auto-sync, manual sync for immediate update
- **Non-Blocking Sync:** If manual sync fails, events still work
- **Service Layer:** Asset service, solvency service, contract service
- **Type Safety:** Full TypeScript types for all APIs
- **Error Handling:** User-friendly messages, can retry operations

---

**Implementation Status:** ✅ All flows implemented and tested
**Build Status:** ✅ Passes TypeScript compilation
**Documentation:** ✅ Complete with edge cases covered
