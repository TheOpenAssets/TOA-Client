# Implementation Analysis & Gap Report

**Date:** January 8, 2026
**Purpose:** Analyze current implementation against updated documentation and identify necessary changes

---

## 📋 Documentation Analysis Summary

### ✅ Key Findings from COMPLETE_LOAN.md

**Investor Flow (Direct Wallet - NO Backend API):**
1. **Deposit Collateral**
   - On-chain: `approve()` → `depositCollateral()`
   - Backend sync: `POST /solvency/position/sync` (after transaction)
   - Events: `PositionCreated` → Auto-syncs MongoDB

2. **Borrow USDC**
   - On-chain: `borrowUSDC(positionId, amount, duration, installments)` DIRECT
   - ❌ NO Backend API call for borrowing
   - Events: `USDCBorrowed`, `RepaymentPlanCreated` → Auto-syncs MongoDB

3. **Repay Loan**
   - On-chain: `approve()` USDC → `repayLoan()` via SeniorPool DIRECT
   - ❌ NO Backend API call for repayment
   - Events: `LoanRepaid` → Auto-syncs MongoDB

**Admin Flow (Backend API - NOT Direct Wallet):**
1. **Mark Missed Payment**: `POST /admin/solvency/position/:id/mark-missed-payment`
2. **Mark Defaulted**: `POST /admin/solvency/position/:id/mark-defaulted`
3. **Liquidate**: `POST /admin/solvency/liquidate/:id`
4. **Settle Liquidation**: `POST /admin/solvency/position/:id/settle-liquidation`

### ✅ Key Findings from FRONTEND_INTEGRATION_GUIDE.md

**Decision Matrix:**
| Operation | Method | Reason |
|-----------|--------|--------|
| Deposit Collateral | 🟢 Direct Wallet | User owns collateral |
| Borrow USDC | 🟢 Direct Wallet | User taking loan |
| Repay Loan | 🟢 Direct Wallet | User repaying debt |
| Mark Missed Payment | 🔵 Backend API | Admin-only operation |
| Liquidate | 🔵 Backend API | Admin-only operation |

**MongoDB Auto-Sync:**
- All blockchain transactions emit events
- Backend event listeners catch events
- MongoDB automatically updated within 5-10 seconds
- ✅ Frontend queries MongoDB via GET APIs
- ❌ Frontend does NOT call backend for write operations (borrow/repay)

---

## 🔍 Current Implementation Review

### ✅ CORRECT Implementations

#### 1. **Borrow Page** (`src/pages/borrow/BorrowPage.tsx`)
**Status:** ✅ CORRECT

**Current Flow:**
```typescript
// ✅ Fetches credit from backend
GET /solvency/oaid/my-credit

// ✅ Case A: Credit > 0 → Shows borrow modal
// ✅ Case B: Credit = 0 → Blocking message with redirect to Portfolio
```

**Verdict:** No changes needed

---

#### 2. **DepositCollateralModal** (`src/pages/borrow/components/DepositCollateralModal.tsx`)
**Status:** ✅ CORRECT

**Current Flow:**
```typescript
// ✅ Direct wallet transaction
1. approve(SolvencyVault, amount) - ERC20 Token
2. depositCollateral(...) - SolvencyVault
3. Parse PositionCreated event
4. POST /solvency/sync-position (backend sync)
```

**Verdict:** No changes needed

---

#### 3. **MyLoansTable** (`src/components/portfolio/MyLoansTable.tsx`)
**Status:** ✅ CORRECT

**Current APIs:**
```typescript
// ✅ Fetches positions from MongoDB
GET /solvency/positions/my?status=ACTIVE

// ✅ Fetches schedule on expand
GET /solvency/position/:id/schedule
```

**Verdict:** No changes needed

---

### ❌ INCORRECT Implementations - REQUIRE FIXES

#### 1. **UnifiedBorrowModal** (`src/pages/borrow/components/UnifiedBorrowModal.tsx`)
**Status:** ❌ INCORRECT - Uses backend API instead of direct wallet

**Current Implementation (WRONG):**
```typescript
// ❌ WRONG: Calls backend API
const borrowResult = await solvencyContractService.borrowUSDC(
  parseInt(selectedPositionId),
  amountWei
);

await solvencyService.syncPosition({
  positionId: selectedPositionId,
  txHash: borrowResult.txHash!,
  blockNumber: borrowResult.blockNumber!,
});
```

**What It Should Be (CORRECT):**
```typescript
// ✅ CORRECT: Direct wallet transaction
// Step 1: Get position details
const positionResponse = await solvencyService.getPosition(positionId);

// Step 2: Get asset to determine maturity
const assetResponse = await fetch(`/assets/token/${position.collateralTokenAddress}`);
const asset = await assetResponse.json();

// Step 3: Calculate loan duration
const dueDate = new Date(asset.metadata.dueDate);
const durationSeconds = Math.floor((dueDate - now) / 1000);

// Step 4: Direct contract call via wallet
const solvencyVault = new ethers.Contract(VAULT_ADDRESS, ABI, signer);
const tx = await solvencyVault.borrowUSDC(
  positionId,
  amount,
  durationSeconds,
  numberOfInstallments
);
await tx.wait();

// ✅ NO backend sync needed - events auto-sync MongoDB
```

**Required Changes:**
- Remove backend API call
- Add asset lookup to calculate maturity
- Add direct contract call via ethers
- Remove manual sync (events handle it)
- Add polling after transaction to wait for MongoDB sync

---

#### 2. **RepayLoanModal** (`src/components/portfolio/RepayLoanModal.tsx`)
**Status:** ❌ INCORRECT - Uses backend API instead of direct wallet

**Current Implementation (WRONG):**
```typescript
// ❌ WRONG: Calls backend API
const approvalResult = await solvencyContractService.approveUSDC(amountWei);

const repayResult = await solvencyService.repayLoan({
  positionId: position.positionId.toString(),
  amount: amountWei.toString(),
});
```

**What It Should Be (CORRECT):**
```typescript
// ✅ CORRECT: Direct wallet transaction via SeniorPool

// Step 1: Get SeniorPool address from SolvencyVault
const solvencyVault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
const seniorPoolAddress = await solvencyVault.seniorPool();

// Step 2: Approve USDC for SeniorPool
const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
const approveTx = await usdc.approve(seniorPoolAddress, amount);
await approveTx.wait();

// Step 3: Repay via SeniorPool directly
const seniorPool = new ethers.Contract(seniorPoolAddress, SENIOR_POOL_ABI, signer);
const repayTx = await seniorPool.repayLoan(positionId, amount);
await repayTx.wait();

// ✅ NO backend sync needed - events auto-sync MongoDB
```

**Required Changes:**
- Remove backend API call
- Add SeniorPool address lookup
- Add direct contract call via SeniorPool
- Remove manual sync
- Add polling after transaction

---

#### 3. **solvency.service.ts** (`src/lib/api/solvency.service.ts`)
**Status:** ⚠️ PARTIALLY INCORRECT - Contains unnecessary backend methods

**Current Methods (WRONG - Should Be Removed/Deprecated):**
```typescript
// ❌ REMOVE: These should NOT be backend APIs
async borrowUSDC(request: { positionId, amount, loanDuration, numberOfInstallments })
async repayLoan(request: { positionId, amount })
```

**Methods to KEEP:**
```typescript
// ✅ KEEP: Read operations
async getOAIDCredit()
async getMyPositions(status, limit, offset)
async getPosition(positionId)
async getPositionSchedule(positionId)
async syncPosition(request) // Only for deposit sync

// ✅ KEEP: Admin operations
async getAdminLoans()
async liquidatePosition(positionId)
```

**Methods to ADD:**
```typescript
// ✅ ADD: Missing admin operations
async markMissedPayment(positionId)
async markDefaulted(positionId)
async settleLiquidation(positionId)
```

**Required Changes:**
- Remove or deprecate `borrowUSDC()` and `repayLoan()` methods
- Add missing admin API methods
- Update JSDoc comments to clarify which operations are backend vs wallet

---

#### 4. **solvency-contract.service.ts** (`src/lib/api/solvency-contract.service.ts`)
**Status:** ⚠️ INCOMPLETE - Missing SeniorPool methods

**Current Methods:**
```typescript
✅ depositCollateral()
✅ approveToken()
✅ approveUSDC()
✅ getPosition()
✅ borrowUSDC() - EXISTS but signature is wrong
❌ repayLoan() - Method exists but uses wrong contract
```

**Required Changes:**
```typescript
// ✅ UPDATE: borrowUSDC to include duration and installments
async borrowUSDC(
  positionId: number,
  amount: bigint,
  loanDuration: number,        // ← ADD THIS
  numberOfInstallments: number // ← ADD THIS
): Promise<TransactionResult>

// ✅ ADD: Get SeniorPool address
async getSeniorPoolAddress(): Promise<string>

// ✅ UPDATE: Repay via SeniorPool (not SolvencyVault)
async repayLoan(
  positionId: number,
  amount: bigint
): Promise<TransactionResult> {
  // Get SeniorPool address
  const seniorPoolAddress = await this.getSeniorPoolAddress();

  // Call SeniorPool.repayLoan()
  const seniorPool = new ethers.Contract(seniorPoolAddress, SENIOR_POOL_ABI, signer);
  const tx = await seniorPool.repayLoan(positionId, amount);
  await tx.wait();
}
```

---

## 🎯 UX Flow Analysis

### Flow 1: Investor Deposits Collateral (First Time)

**User Actions → System Calls → State Updates**

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER ACTION                                                          │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Navigate to /portfolio                                            │
│    Click "Increase Credit" or "Deposit Collateral" button           │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. DepositCollateralModal Opens                                     │
│    INPUT: Select asset from dropdown                                │
│    API: GET /portfolio/my (fetch user's assets)                     │
│    STATE: portfolio[] populated                                     │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. User Selects Asset                                               │
│    API: GET /assets/:assetId                                        │
│    STATE: assetDetails populated (token address, price)             │
│    API: getTokenBalance(tokenAddress, userAddress) - ON-CHAIN READ │
│    STATE: tokenBalance updated                                      │
│    UI: Shows balance, price per token                               │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. User Enters Amount                                               │
│    INPUT: depositAmount                                             │
│    VALIDATION: amount <= tokenBalance                               │
│    UI: Shows calculated USD value                                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. User Clicks "Deposit"                                            │
│    STATE: isProcessing = true, step = 'approve'                     │
│    ON-CHAIN: approve(SolvencyVault, amount) - ERC20 Token           │
│    UI: "Approving tokens..." (MetaMask popup)                       │
│    WAIT: Transaction confirmation                                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. Approval Confirmed                                               │
│    STATE: step = 'deposit'                                          │
│    ON-CHAIN: depositCollateral(amount, issueOAID=true)              │
│    UI: "Depositing collateral..." (MetaMask popup)                  │
│    WAIT: Transaction confirmation                                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. Deposit Confirmed                                                │
│    PARSE EVENT: PositionCreated(positionId, ...)                    │
│    STATE: positionId extracted, txHash stored                       │
│    STATE: step = 'syncing'                                          │
│    API: POST /solvency/sync-position                                │
│    UI: "Syncing with backend..."                                    │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. Backend Sync Complete                                            │
│    STATE: step = 'success'                                          │
│    UI: Success modal with position ID                               │
│    NAVIGATION: Close modal, refresh portfolio                       │
│    RESULT: Credit limit increased, OAID created                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Showing on UI (All Real Backend Data):**
- ✅ Asset name, symbol (from GET /assets/:id)
- ✅ Token balance (from on-chain getTokenBalance)
- ✅ Price per token (from backend asset data)
- ✅ Calculated USD value (frontend calculation)
- ✅ Transaction hash (from blockchain receipt)
- ✅ Position ID (from PositionCreated event)

---

### Flow 2: Investor Borrows USDC

**User Actions → System Calls → State Updates**

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER ACTION                                                          │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Navigate to /borrow                                               │
│    API: GET /solvency/oaid/my-credit                                │
│    STATE: creditData populated                                      │
│    UI: Shows available credit OR blocking message                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2a. Case A: Available Credit > 0                                    │
│     UI: Shows large credit amount                                   │
│     UI: "Borrow Now" button enabled                                 │
│                                                                      │
│ 2b. Case B: Available Credit = 0                                    │
│     UI: "No Available Credit" blocking message                      │
│     UI: "Go to Portfolio" CTA button                                │
│     UI: 5-step guide to increase credit                             │
│     NAVIGATION: Redirect to /portfolio                              │
│     ❌ STOP - Cannot proceed                                        │
└────────┬────────────────────────────────────────────────────────────┘
         │ (Only if Case A)
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. User Clicks "Borrow Now"                                         │
│    UnifiedBorrowModal Opens                                         │
│    STATE: creditData passed to modal                                │
│    UI: Shows available credit, position selector                    │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. User Selects Position                                            │
│    INPUT: selectedPositionId                                        │
│    API: GET /solvency/position/:id                                  │
│    STATE: position data loaded                                      │
│    UI: Shows position collateral details                            │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Fetch Asset for Maturity Calculation (🔥 CRITICAL STEP)         │
│    API: GET /assets/token/:tokenAddress                             │
│    STATE: asset data loaded                                         │
│    CALCULATE: loanDuration = asset.dueDate - now                    │
│    VALIDATION: durationSeconds > 0 (asset not matured)              │
│    UI: Shows calculated maturity date                               │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. User Enters Borrow Amount & Installments                         │
│    INPUT: borrowAmount, numberOfInstallments                        │
│    VALIDATION: amount <= availableCredit                            │
│    CALCULATE: installmentAmount = amount / installments             │
│    CALCULATE: paymentInterval = duration / installments             │
│    UI: Shows payment schedule preview                               │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. User Clicks "Borrow Now"                                         │
│    STATE: isBorrowing = true                                        │
│    ON-CHAIN: borrowUSDC(positionId, amount, duration, installments) │
│    UI: "Borrowing USDC..." (MetaMask popup)                         │
│    WAIT: Transaction confirmation                                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. Borrow Transaction Confirmed                                     │
│    PARSE EVENT: USDCBorrowed(positionId, amount, totalDebt)         │
│    PARSE EVENT: RepaymentPlanCreated(...)                           │
│    STATE: txHash stored                                             │
│    ⏳ WAIT: Backend event listener syncs MongoDB (5-10 sec)         │
│    POLLING: GET /solvency/position/:id every 2 seconds              │
│    WAIT UNTIL: position.usdcBorrowed > 0                            │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. MongoDB Synced (Detected via Polling)                            │
│    STATE: isBorrowing = false, success = true                       │
│    UI: Success message                                              │
│    NAVIGATION: Redirect to /portfolio?tab=loans                     │
│    RESULT: Loan created, schedule initialized, credit reduced       │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Showing on UI (All Real Backend Data):**
- ✅ Available credit (from GET /solvency/oaid/my-credit)
- ✅ Position collateral amount (from GET /solvency/position/:id)
- ✅ Asset maturity date (from GET /assets/token/:address)
- ✅ Calculated loan duration (frontend calculation based on asset maturity)
- ✅ Payment schedule preview (frontend calculation)
- ✅ Transaction hash (from blockchain receipt)

**🔥 CRITICAL MISSING STEP IN CURRENT IMPLEMENTATION:**
- ❌ Current implementation does NOT fetch asset to calculate maturity
- ❌ Current implementation calls backend API instead of direct contract
- ✅ MUST ADD: Asset lookup and duration calculation

---

### Flow 3: Investor Views Loan Schedule

**User Actions → System Calls → State Updates**

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Navigate to /portfolio → My Loans Tab                            │
│    API: GET /solvency/positions/my?status=ACTIVE                    │
│    STATE: myLoans[] populated                                       │
│    UI: Shows loan cards grid                                        │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. User Clicks "View Schedule" (Down Arrow)                         │
│    STATE: expandedPositionId = positionId                           │
│    API: GET /solvency/position/:id/schedule                         │
│    STATE: scheduleData[positionId] populated                        │
│    UI: Expands section, shows loading spinner                       │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Schedule Data Loaded                                             │
│    STATE: loadingSchedule[positionId] = false                       │
│    UI: Shows schedule summary:                                      │
│      - Installments paid: X / Y                                     │
│      - Missed payments: Z                                           │
│      - Next payment due: Date                                       │
│      - Payment interval: N days                                     │
│    UI: Shows installment list with statuses                         │
│    ❌ NO POLLING - One-time fetch                                   │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Showing on UI (All Real Backend Data):**
- ✅ Loan duration (from schedule API)
- ✅ Number of installments (from schedule API)
- ✅ Installments paid (from schedule API)
- ✅ Missed payments count (from schedule API)
- ✅ Next payment due date (from schedule API)
- ✅ Installment list with statuses (PAID/PENDING/MISSED)

---

### Flow 4: Investor Repays Loan

**User Actions → System Calls → State Updates**

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User Clicks "Repay" Button on Loan Card                          │
│    STATE: selectedPosition = position                               │
│    STATE: showRepayModal = true                                     │
│    RepayLoanModal Opens                                             │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Modal Auto-Fills Next Installment Amount                         │
│    IF schedule exists:                                              │
│      FIND: Next unpaid installment (status = PENDING/MISSED)        │
│      STATE: repayAmount = nextInstallment.amount                    │
│    UI: Shows pre-filled amount, outstanding debt                    │
│    UI: Quick buttons (Next Payment, Half, Full Amount)              │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. User Confirms/Adjusts Amount & Clicks "Repay"                    │
│    STATE: isApproving = true, currentStep = 'approving'             │
│    ON-CHAIN: Get SeniorPool address from SolvencyVault              │
│    ON-CHAIN: approve(SeniorPool, amount) - USDC                     │
│    UI: "Approving USDC..." (MetaMask popup)                         │
│    WAIT: Approval confirmation                                      │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Approval Confirmed                                               │
│    STATE: isApproving = false, isRepaying = true                    │
│    STATE: currentStep = 'repaying'                                  │
│    ON-CHAIN: seniorPool.repayLoan(positionId, amount)               │
│    UI: "Processing repayment..." (MetaMask popup)                   │
│    WAIT: Transaction confirmation                                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Repayment Transaction Confirmed                                  │
│    PARSE EVENT: LoanRepaid(positionId, amount, ...)                 │
│    STATE: txHash stored, currentStep = 'syncing'                    │
│    ⏳ WAIT: Backend event listener syncs MongoDB (5-10 sec)         │
│    POLLING: GET /solvency/position/:id every 2 seconds              │
│    WAIT UNTIL: position.totalRepaid increases                       │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. MongoDB Synced (Detected via Polling)                            │
│    STATE: success = true, isRepaying = false                        │
│    UI: "Repayment Successful!" message                              │
│    CALLBACK: onSuccess() triggered                                  │
│    ACTION: Refresh loan table, clear schedule cache                 │
│    RESULT: Debt reduced, schedule updated, credit increased         │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Showing on UI (All Real Backend Data):**
- ✅ Outstanding debt (from position data)
- ✅ Next installment amount (from schedule data)
- ✅ Payment history (from schedule data)
- ✅ Transaction hash (from blockchain receipt)

**🔥 CRITICAL MISSING IN CURRENT IMPLEMENTATION:**
- ❌ Current implementation calls backend API `POST /solvency/repay`
- ✅ MUST CHANGE: Direct contract call via SeniorPool
- ❌ Current implementation doesn't get SeniorPool address
- ✅ MUST ADD: SeniorPool address lookup and direct call

---

## 📊 Service Call Matrix

### Current vs. Required Calls

| Operation | Current Implementation | Should Be | Fix Required |
|-----------|------------------------|-----------|--------------|
| **Deposit Collateral** | ✅ Direct: approve() → depositCollateral() | ✅ Direct wallet | ❌ No |
| **Borrow USDC** | ❌ Backend: POST /solvency/borrow | ✅ Direct: borrowUSDC() + asset lookup | ✅ YES |
| **Repay Loan** | ❌ Backend: POST /solvency/repay | ✅ Direct: SeniorPool.repayLoan() | ✅ YES |
| **Get Credit** | ✅ Backend: GET /solvency/oaid/my-credit | ✅ Backend API | ❌ No |
| **Get Positions** | ✅ Backend: GET /solvency/positions/my | ✅ Backend API | ❌ No |
| **Get Schedule** | ✅ Backend: GET /solvency/position/:id/schedule | ✅ Backend API | ❌ No |
| **Admin Mark Missed** | ❌ Not implemented | ✅ Backend: POST /admin/solvency/position/:id/mark-missed-payment | ✅ YES |
| **Admin Liquidate** | ❌ Not implemented | ✅ Backend: POST /admin/solvency/liquidate/:id | ✅ YES |

---

## 🔧 Required Code Changes Summary

### High Priority (Breaks Current Flow)

1. **UnifiedBorrowModal.tsx** - Complete rewrite of borrow logic
   - Remove backend API call
   - Add asset lookup for maturity
   - Add direct contract call
   - Add post-transaction polling

2. **RepayLoanModal.tsx** - Complete rewrite of repay logic
   - Remove backend API call
   - Add SeniorPool address lookup
   - Add direct contract call via SeniorPool
   - Add post-transaction polling

3. **solvency-contract.service.ts** - Update signatures
   - Update borrowUSDC() to include duration and installments
   - Update repayLoan() to use SeniorPool
   - Add getSeniorPoolAddress() method

### Medium Priority (Missing Features)

4. **solvency.service.ts** - Add admin APIs
   - Add markMissedPayment(positionId)
   - Add markDefaulted(positionId)
   - Add settleLiquidation(positionId)
   - Deprecate/remove borrowUSDC() and repayLoan() backend methods

### Low Priority (Cleanup)

5. **Remove unused backend methods**
   - Document why borrowUSDC() and repayLoan() backend methods exist but shouldn't be used

---

## ⏱️ Polling Strategy

### When to Poll:

| Action | Poll Endpoint | Poll Until | Interval | Max Duration |
|--------|--------------|------------|----------|--------------|
| After Deposit | GET /solvency/position/:id | position exists | 2 sec | 30 sec |
| After Borrow | GET /solvency/position/:id | usdcBorrowed > 0 | 2 sec | 30 sec |
| After Repay | GET /solvency/position/:id | totalRepaid updated | 2 sec | 30 sec |
| Loan List View | GET /solvency/positions/my | - | 30 sec | Continuous |

### When NOT to Poll:

- ❌ After expanding loan schedule (one-time fetch)
- ❌ On Borrow page (static credit check)
- ❌ On position detail view (refresh button instead)

---

## ✅ Implementation Checklist

### Phase 1: Fix Critical Flows
- [ ] Update UnifiedBorrowModal with direct wallet + asset lookup
- [ ] Update RepayLoanModal with SeniorPool direct call
- [ ] Update solvency-contract.service.ts signatures
- [ ] Add polling logic after borrow/repay transactions

### Phase 2: Add Missing Admin APIs
- [ ] Add admin API methods to solvency.service.ts
- [ ] Create admin components (if needed)

### Phase 3: Testing
- [ ] Test deposit → borrow → repay full flow
- [ ] Test polling waits for MongoDB sync
- [ ] Test error handling (rejected transactions)
- [ ] Test with real blockchain transactions

### Phase 4: Documentation
- [ ] Update inline code comments
- [ ] Verify all flows match COMPLETE_LOAN.md
- [ ] Update SOLVENCY_VAULT_IMPLEMENTATION.md if needed

---

**End of Analysis**

