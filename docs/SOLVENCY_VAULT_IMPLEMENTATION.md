# Solvency Vault: Complete Implementation Documentation

> **Borrow Feature - End-to-End Flow**
> From Deposit → Borrow → Repay → Admin Liquidation

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Implementation Flow](#implementation-flow)
3. [Pages Built](#pages-built)
4. [Components Built](#components-built)
5. [API Endpoints](#api-endpoints)
6. [Smart Contract Functions](#smart-contract-functions)
7. [Complete User Flows](#complete-user-flows)
8. [Admin Functions](#admin-functions)
9. [Scripts Available](#scripts-available)

---

## 🏗️ System Overview

The Solvency Vault system enables users to:
- **Deposit** RWA/Private Asset tokens as collateral (Portfolio only)
- **Borrow** USDC against their credit line (Borrow page)
- **Repay** loans via installment schedule (Portfolio - My Loans)
- **Monitor** health factor and avoid liquidation
- **Admin** can liquidate defaulted positions

**Mental Model:**
- Deposit = Increase Credit Limit
- Borrow = Consume Credit
- OAID = Credit Identity (read-only for user)
- Position = Collateral container
- Loan = Scheduled debt on a position

---

## 🔄 Implementation Flow

### Phase 1: Deposit Collateral (Increase Credit)
**Where:** Portfolio Page Only
**Trigger:** User clicks "Increase Credit" or "Deposit Collateral"

**Flow:**
1. User selects RWA asset from portfolio
2. User enters deposit amount
3. **On-Chain:** `approve(SolvencyVault, amount)` - ERC20
4. **On-Chain:** `depositCollateral(token, amount, valueUSD, tokenType, issueOAID)` - SolvencyVault
5. **Event Emitted:** `PositionCreated(positionId, user, token, amount, valueUSD, tokenType)`
6. **Backend API:** `POST /solvency/sync-position`
7. Backend indexes position and creates/updates OAID credit line
8. **Success:** Credit limit increased, ready to borrow

---

### Phase 2: Borrow USDC (Consume Credit)
**Where:** Borrow Page Only
**Trigger:** User clicks "Borrow Now"

**Pre-Check:**
1. **Backend API:** `GET /solvency/oaid/my-credit`
2. **Case A (Credit > 0):** Show borrow modal
3. **Case B (Credit = 0):** Show blocking message + redirect to Portfolio

**Borrow Flow:**
1. User enters borrow amount and installment count
2. **Backend API:** `POST /solvency/borrow`
3. Backend validates credit availability
4. **On-Chain:** Backend calls `borrowUSDC(positionId, amount, duration, installments)`
5. Backend initializes repayment schedule
6. Backend updates OAID credit usage
7. **Success:** USDC transferred to user, loan created

---

### Phase 3: View Loan Schedule (Monitor)
**Where:** Portfolio Page → My Loans Tab
**Trigger:** User clicks "View Schedule" on a loan card

**Flow:**
1. User expands loan card (down arrow like My Assets)
2. **Backend API:** `GET /solvency/position/{positionId}/schedule`
3. Display:
   - Loan duration
   - Number of installments
   - Installments paid / total
   - Missed payments count
   - Next payment due date
   - Full installment list with status (PAID/PENDING/MISSED)

---

### Phase 4: Repay Loan (Reduce Debt)
**Where:** Portfolio Page → My Loans Tab
**Trigger:** User clicks "Repay" button on loan card

**Flow:**
1. Modal opens with next unpaid installment pre-filled
2. User confirms/adjusts repayment amount
3. **On-Chain:** `approve(SolvencyVault, amount)` - USDC
4. **Backend API:** `POST /solvency/repay`
5. Backend updates repayment schedule
6. **On-Chain:** Backend calls `repayLoan(positionId, amount)`
7. Backend refreshes OAID available credit
8. **Success:** Debt reduced, credit increased, schedule updated

---

### Phase 5: Admin Liquidation (Risk Management)
**Where:** Admin Dashboard (if built) or Direct Script
**Trigger:** Health factor below threshold OR 3+ missed payments

**Flow:**
1. **Backend API:** `GET /admin/solvency/loans`
2. Admin identifies positions with:
   - Health factor < 100%
   - Status = DEFAULTED
3. **Backend API:** `POST /admin/solvency/liquidate/{positionId}`
4. Backend seizes collateral
5. Position marked LIQUIDATED
6. OAID credit revoked

---

## 📄 Pages Built

### 1. Borrow Page (`/borrow`)
**File:** `src/pages/borrow/BorrowPage.tsx`

**Purpose:** Consumption of existing credit only (NO deposit)

**Features:**
- Loading state while fetching credit
- Wallet connection check
- Credit availability check via `GET /solvency/oaid/my-credit`
- **Case A (Credit > 0):** Shows available credit + "Borrow Now" button
- **Case B (Credit = 0):** Shows blocking message with:
  - "No Available Credit" heading
  - Instructions on how to increase credit
  - CTA button: "Go to Portfolio → Increase Credit"
  - 5-step guide to get credit

**API Calls:**
- `GET /solvency/oaid/my-credit` (on mount, on wallet connect)

**On-Chain Calls:** None (handled by backend in borrow modal)

**Navigation:**
- Success → `/portfolio?tab=loans`
- No Credit → `/portfolio`

---

### 2. Portfolio Page (`/portfolio`)
**File:** `src/pages/portfolio/Portfolio.page.tsx`

**Purpose:** View positions, loans, manage collateral

**Tabs:**
- My Assets (existing)
- My Bids (existing)
- **My Loans** (NEW - Solvency positions)
- Leveraged Positions (existing)

**Features:**
- Deposit Collateral modal (accessible from portfolio)
- My Loans table with expandable schedule
- Repayment modal integration

**API Calls:**
- `GET /solvency/positions/my?status=ACTIVE` (fetch my loans)
- Calls forwarded to child components

**On-Chain Calls:** None directly (handled by modals)

---

## 🧩 Components Built

### 1. UnifiedBorrowModal
**File:** `src/pages/borrow/components/UnifiedBorrowModal.tsx`

**Purpose:** Borrow USDC against existing credit

**Props:**
- `creditData` - OAID credit line data
- `onSuccess` - Callback after successful borrow
- `onClose` - Close modal

**Features:**
- Shows available credit
- Position selector (borrow against which position)
- Borrow amount input with validation
- Real-time credit check

**API Calls:**
- `POST /solvency/borrow`

**On-Chain Calls:**
- Via backend (borrowUSDC transaction)

---

### 2. DepositCollateralModal
**File:** `src/pages/borrow/components/DepositCollateralModal.tsx`

**Purpose:** Deposit RWA tokens to increase credit (Portfolio only)

**Features:**
- Asset selection from user's portfolio
- Amount input with balance check
- Token approval flow
- Deposit execution
- Backend sync

**API Calls:**
- `GET /portfolio/my` (fetch portfolio assets)
- `GET /assets/{assetId}` (fetch asset details)
- `POST /solvency/sync-position` (after deposit)

**On-Chain Calls:**
- `approve(SolvencyVault, amount)` - ERC20 Token
- `depositCollateral(token, amount, valueUSD, tokenType, issueOAID)` - SolvencyVault

**Events Parsed:**
- `PositionCreated(positionId, user, token, amount, valueUSD, tokenType)`

---

### 3. MyLoansTable (Enhanced)
**File:** `src/components/portfolio/MyLoansTable.tsx`

**Purpose:** Display user's loan positions with expandable schedule

**Features:**
- Card-based grid layout
- Filters: All, Healthy, At Risk, Critical
- Sort: Date, Health Factor, Debt Amount
- **Expandable rows** (down arrow like My Assets)
- Shows loan schedule on expand
- Repay button on each card
- Empty state with CTA to /borrow

**API Calls:**
- `GET /solvency/position/{positionId}/schedule` (on expand)

**On-Chain Calls:** None

**Child Components:**
- RepayLoanModal (triggered by Repay button)

---

### 4. RepayLoanModal (NEW)
**File:** `src/components/portfolio/RepayLoanModal.tsx`

**Purpose:** Repay loan installments

**Features:**
- Pre-fills next unpaid installment amount
- Quick amount buttons: Next Payment, Half, Full Amount
- USDC approval flow
- Repayment execution via backend
- Success/error handling
- Auto-refresh after success

**API Calls:**
- `POST /solvency/repay`

**On-Chain Calls:**
- `approve(SolvencyVault, amount)` - USDC
- Via backend: `repayLoan(positionId, amount)` - SolvencyVault

**Transaction Steps:**
1. Approving USDC
2. Processing repayment (backend handles on-chain)
3. Syncing (backend updates schedule)

---

## 🌐 API Endpoints

### Backend Solvency Service
**File:** `src/lib/api/solvency.service.ts`

---

#### GET /solvency/oaid/my-credit
**Purpose:** Fetch user's OAID credit line data

**Auth:** Required (Bearer JWT)

**Response:**
```typescript
{
  totalCreditLimit: string;          // "35000000000" (6 decimals)
  totalCreditUsed: string;            // "20000000000"
  totalAvailableCredit: string;       // "15000000000"
  summary: {
    utilizationRate: string;          // "57.14%"
    activeCreditLines: number;
    totalCreditLines: number;
  };
  creditLines: Array<{
    creditLineId: number;
    solvencyPositionId: number;
    creditLimit: string;
    creditUsed: string;
    active: boolean;
    collateralToken: string;
    collateralAmount: string;
  }>;
}
```

**Used By:**
- Borrow Page (initial check)
- useCreditData hook

---

#### GET /solvency/positions/my
**Purpose:** Fetch user's borrow positions

**Auth:** Required

**Query Params:**
- `status` - ACTIVE | CLOSED
- `limit` - number (default 20)
- `offset` - number (default 0)

**Response:**
```typescript
{
  positions: Position[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

**Position Structure:**
```typescript
{
  positionId: number;
  collateralToken: {
    address: string;
    symbol: string;
    name: string;
    type: string; // "RWA" | "PRIVATE_ASSET"
  };
  collateralAmount: string;   // "90000000000000000000" (18 decimals)
  tokenValueUSD: string;      // "76500000000" (6 decimals)
  usdcBorrowed: string;       // "50000000000" (6 decimals)
  outstandingDebt: string;    // "50041100000" (6 decimals)
  healthFactor: number;       // 15300 (153.00%)
  healthStatus: string;       // "HEALTHY" | "WARNING" | "CRITICAL"
  status: string;             // "ACTIVE" | "CLOSED"
  maxBorrowCapacity: string;
  createdAt: string;
}
```

**Used By:**
- Portfolio Page (My Loans tab)

---

#### GET /solvency/position/{positionId}/schedule
**Purpose:** Fetch loan repayment schedule

**Auth:** Required

**Response:**
```typescript
{
  schedule: {
    loanDuration: number;        // seconds
    numberOfInstallments: number;
    installmentInterval: number; // seconds
    installmentsPaid: number;
    missedPayments: number;
    nextPaymentDue: number;      // unix timestamp
    installments: Array<{
      installmentNumber: number;
      dueDate: number;           // unix timestamp
      amount: string;            // "16666666" (6 decimals)
      status: 'PAID' | 'PENDING' | 'MISSED';
    }>;
  };
}
```

**Used By:**
- MyLoansTable (on expand)

---

#### POST /solvency/sync-position
**Purpose:** Sync on-chain position to backend database

**Auth:** Required

**Request Body:**
```typescript
{
  positionId: string;
  txHash: string;
  blockNumber: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  position: {
    id: string;
    positionId: number;
    userAddress: string;
    collateralTokenAddress: string;
    collateralAmount: string;
    tokenValueUSD: string;
    maxBorrowCapacity: string;
    status: string;
    oaidCreditLineId?: number;
  };
}
```

**Used By:**
- DepositCollateralModal (after deposit transaction)

---

#### POST /solvency/borrow
**Purpose:** Borrow USDC against position (backend executes on-chain)

**Auth:** Required

**Request Body:**
```typescript
{
  positionId: string;
  amount: string;              // "50000000" (6 decimals)
  loanDuration: number;        // seconds
  numberOfInstallments: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  txHash?: string;
  blockNumber?: number;
}
```

**Backend Actions:**
1. Validates credit availability
2. Calls `borrowUSDC(positionId, amount, duration, installments)` on-chain
3. Initializes repayment schedule in database
4. Updates OAID credit usage

**Used By:**
- UnifiedBorrowModal

---

#### POST /solvency/repay
**Purpose:** Repay loan installment (backend executes on-chain)

**Auth:** Required

**Request Body:**
```typescript
{
  positionId: string;
  amount: string; // "16666666" (6 decimals)
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  txHash?: string;
  blockNumber?: number;
}
```

**Backend Actions:**
1. Calls `repayLoan(positionId, amount)` on-chain
2. Updates repayment schedule
3. Refreshes OAID available credit

**Used By:**
- RepayLoanModal

---

#### GET /admin/solvency/loans
**Purpose:** Admin view of all loans for monitoring

**Auth:** Required (Admin role)

**Response:**
```typescript
{
  loans: Array<{
    userWallet: string;
    asset: string;
    positionId: number;
    outstandingDebt: string;
    healthFactor: number;
    ltv: number;
    status: string;
  }>;
}
```

**Used By:**
- Admin Dashboard (future)
- Admin monitoring tools

---

#### POST /admin/solvency/liquidate/{positionId}
**Purpose:** Liquidate a defaulted position

**Auth:** Required (Admin role)

**Response:**
```typescript
{
  success: boolean;
  message: string;
  txHash?: string;
}
```

**Backend Actions:**
1. Validates health factor < 100% OR status = DEFAULTED
2. Seizes collateral
3. Marks position as LIQUIDATED
4. Revokes OAID credit

**Used By:**
- Admin tools
- Automated liquidation bot (future)

---

## ⛓️ Smart Contract Functions

### Contract Service
**File:** `src/lib/api/solvency-contract.service.ts`

---

### ERC20 Token Functions

#### approve(spender, amount)
**Contract:** RWA Token (ERC20)

**Purpose:** Approve SolvencyVault to spend tokens

**Parameters:**
- `spender` - SolvencyVault contract address
- `amount` - Amount to approve (18 decimals)

**Returns:** Transaction receipt

**Called By:**
- DepositCollateralModal (before deposit)

---

#### approve(spender, amount)
**Contract:** USDC (ERC20)

**Purpose:** Approve SolvencyVault to spend USDC for repayment

**Parameters:**
- `spender` - SolvencyVault contract address
- `amount` - Amount to approve (6 decimals)

**Returns:** Transaction receipt

**Called By:**
- RepayLoanModal (before repay)

---

### SolvencyVault Functions

#### depositCollateral(token, amount, valueUSD, tokenType, issueOAID)
**Contract:** SolvencyVault

**Purpose:** Deposit collateral and optionally create OAID credit line

**Parameters:**
- `token` - Collateral token address
- `amount` - Amount to deposit (18 decimals)
- `valueUSD` - USD value of collateral (6 decimals)
- `tokenType` - 0 = RWA, 1 = PRIVATE_ASSET
- `issueOAID` - true to create credit line

**Returns:** Transaction receipt with `PositionCreated` event

**Events:**
```solidity
event PositionCreated(
  uint256 indexed positionId,
  address indexed user,
  address collateralToken,
  uint256 collateralAmount,
  uint256 tokenValueUSD,
  uint8 tokenType
)
```

**Called By:**
- DepositCollateralModal
- Direct script: `deposit-to-solvency-vault.js`

---

#### borrowUSDC(positionId, amount, duration, installments)
**Contract:** SolvencyVault

**Purpose:** Borrow USDC from SeniorPool against position

**Parameters:**
- `positionId` - Position to borrow against
- `amount` - USDC amount to borrow (6 decimals)
- `duration` - Loan duration in seconds
- `installments` - Number of repayment installments

**Returns:** Transaction receipt

**Events:**
```solidity
event USDCBorrowed(
  uint256 indexed positionId,
  uint256 amount,
  uint256 totalDebt
)
```

**Called By:**
- Backend (via POST /solvency/borrow)
- Direct script: `borrow-solvency-loan.js`

---

#### repayLoan(positionId, amount)
**Contract:** SolvencyVault

**Purpose:** Repay debt for a position

**Parameters:**
- `positionId` - Position to repay
- `amount` - USDC amount to repay (6 decimals)

**Returns:** Transaction receipt

**Events:**
```solidity
event LoanRepaid(
  uint256 indexed positionId,
  uint256 amount,
  uint256 principal,
  uint256 interest,
  uint256 remainingDebt
)
```

**Called By:**
- Backend (via POST /solvency/repay)
- Direct script: `repay-solvency-loan.js`

---

#### withdrawCollateral(positionId, amount)
**Contract:** SolvencyVault

**Purpose:** Withdraw collateral from position (only if no debt)

**Parameters:**
- `positionId` - Position to withdraw from
- `amount` - Amount to withdraw (18 decimals)

**Returns:** Transaction receipt

**Called By:**
- Future: Withdraw modal (not yet implemented)

---

#### positions(positionId)
**Contract:** SolvencyVault (View Function)

**Purpose:** Read position data from blockchain

**Parameters:**
- `positionId` - Position ID to query

**Returns:**
```typescript
{
  user: address;
  collateralToken: address;
  collateralAmount: uint256;
  usdcBorrowed: uint256;
  tokenValueUSD: uint256;
  createdAt: uint256;
  active: bool;
  tokenType: uint8;
}
```

**Called By:**
- Contract service (verification)
- Scripts

---

### OAID Contract Functions

#### isUserRegistered(user)
**Contract:** OAID

**Purpose:** Check if user has OAID registration

**Parameters:**
- `user` - User wallet address

**Returns:** `bool`

**Called By:**
- Script: `check-oaid-credit.js`

---

#### getTotalCreditLimit(user)
**Contract:** OAID

**Purpose:** Get user's total credit limit

**Parameters:**
- `user` - User wallet address

**Returns:** `uint256` (6 decimals)

**Called By:**
- Script: `check-oaid-credit.js`

---

#### getTotalAvailableCredit(user)
**Contract:** OAID

**Purpose:** Get user's available credit

**Parameters:**
- `user` - User wallet address

**Returns:** `uint256` (6 decimals)

**Called By:**
- Script: `check-oaid-credit.js`

---

#### getUserCreditLines(user)
**Contract:** OAID

**Purpose:** Get all credit line IDs for user

**Parameters:**
- `user` - User wallet address

**Returns:** `uint256[]` (array of credit line IDs)

**Called By:**
- Script: `check-oaid-credit.js`

---

#### getCreditLine(creditLineId)
**Contract:** OAID

**Purpose:** Get credit line details

**Parameters:**
- `creditLineId` - Credit line ID

**Returns:**
```solidity
struct CreditLine {
  address user;
  address collateralToken;
  uint256 collateralAmount;
  uint256 creditLimit;
  uint256 creditUsed;
  uint256 solvencyPositionId;
  uint256 issuedAt;
  uint256 totalPayments;
  uint256 onTimePayments;
  uint256 latePayments;
  uint256 totalAmountRepaid;
  bool liquidated;
  uint256 liquidatedAt;
  bool active;
}
```

**Called By:**
- Script: `check-oaid-credit.js`

---

### SeniorPool Functions

#### getOutstandingDebt(positionId)
**Contract:** SeniorPool (View Function)

**Purpose:** Get total outstanding debt including interest

**Parameters:**
- `positionId` - Position ID

**Returns:** `uint256` (6 decimals)

**Called By:**
- Script: `repay-solvency-loan.js`

---

## 🔁 Complete User Flows

### Flow 1: First-Time User Borrows USDC

**Starting Point:** User has RWA tokens in portfolio

**Steps:**

1. **Navigate to /portfolio**
2. **Click "Increase Credit" or "Deposit Collateral"**
3. **DepositCollateralModal opens**
   - Select asset from portfolio
   - Enter deposit amount
   - Click "Deposit"
4. **On-Chain:** `approve(SolvencyVault, amount)` - RWA Token
5. **On-Chain:** `depositCollateral(token, amount, valueUSD, RWA, true)`
6. **Event:** `PositionCreated(positionId, ...)`
7. **API:** `POST /solvency/sync-position`
8. **Backend:** Creates position record, issues OAID credit line
9. **Success:** Modal shows success, portfolio refreshes
10. **Navigate to /borrow**
11. **API:** `GET /solvency/oaid/my-credit`
12. **Page shows available credit** (e.g., $53,550.00)
13. **Click "Borrow Now"**
14. **UnifiedBorrowModal opens**
    - Select position
    - Enter borrow amount (e.g., $30,000)
    - Enter installments (e.g., 3)
15. **Click "Borrow Now"**
16. **API:** `POST /solvency/borrow`
17. **Backend executes:** `borrowUSDC(positionId, 30000000000, duration, 3)`
18. **Backend:** Initializes repayment schedule
19. **Success:** Modal closes, redirects to `/portfolio?tab=loans`
20. **My Loans tab shows new loan**

---

### Flow 2: User Repays Loan Installment

**Starting Point:** User has active loan

**Steps:**

1. **Navigate to /portfolio → My Loans tab**
2. **API:** `GET /solvency/positions/my?status=ACTIVE`
3. **Page shows loan cards**
4. **Click "View Schedule" on a loan card** (down arrow)
5. **API:** `GET /solvency/position/{positionId}/schedule`
6. **Schedule expands showing:**
   - Installments paid: 0 / 3
   - Missed payments: 0
   - Next payment due: Feb 15, 2026
   - Payment interval: 30 days
   - Installment list with statuses
7. **Click "Repay" button**
8. **RepayLoanModal opens**
   - Pre-filled with next installment: $10,000.00
   - Shows outstanding debt: $30,082.19
9. **User confirms amount**
10. **Click "Repay $10,000.00"**
11. **On-Chain:** `approve(SolvencyVault, 10000000000)` - USDC
12. **API:** `POST /solvency/repay`
13. **Backend executes:** `repayLoan(positionId, 10000000000)`
14. **Backend:** Updates schedule (marks installment PAID)
15. **Backend:** Refreshes OAID credit
16. **Success:** Modal closes, loan table refreshes
17. **Schedule now shows:**
    - Installments paid: 1 / 3
    - Next payment due: Mar 15, 2026
    - First installment marked PAID

---

### Flow 3: User Fully Repays Loan

**Starting Point:** User has loan with $10,082.19 remaining

**Steps:**

1. **Navigate to /portfolio → My Loans tab**
2. **Click "Repay" on the loan**
3. **RepayLoanModal opens**
4. **Click "Full Amount" button**
5. **Amount auto-fills: $10,082.19**
6. **Click "Repay $10,082.19"**
7. **On-Chain:** `approve(SolvencyVault, 10082190000)` - USDC
8. **API:** `POST /solvency/repay`
9. **Backend executes:** `repayLoan(positionId, 10082190000)`
10. **Backend:** Marks all installments PAID
11. **Backend:** Sets loan status to CLOSED
12. **Backend:** Refreshes OAID credit (full credit restored)
13. **Success:** Modal shows "🎉 Loan fully repaid!"
14. **Loan table refreshes**
15. **Loan status changes to CLOSED**
16. **Outstanding debt shows $0.00**
17. **User can now withdraw collateral** (future feature)

---

### Flow 4: Admin Liquidates Defaulted Position

**Starting Point:** User missed 3 payments, health factor < 100%

**Steps:**

1. **Admin navigates to admin dashboard** (or uses script)
2. **API:** `GET /admin/solvency/loans`
3. **Admin sees:**
   - Position #5
   - User: 0x123...
   - Outstanding debt: $30,246.58
   - Health factor: 98.23%
   - Status: DEFAULTED
   - Missed payments: 3
4. **Admin clicks "Liquidate"**
5. **Confirmation modal appears**
6. **Admin confirms liquidation**
7. **API:** `POST /admin/solvency/liquidate/5`
8. **Backend:**
   - Seizes collateral
   - Marks position LIQUIDATED
   - Revokes OAID credit
   - Distributes seized assets
9. **Success:** Position status → LIQUIDATED
10. **User's My Loans shows position as LIQUIDATED**
11. **User cannot borrow against this position anymore**

---

## 👨‍💼 Admin Functions

### Admin Loan Monitoring

**Purpose:** View all active loans across all users

**API:** `GET /admin/solvency/loans`

**Data Shown:**
- User wallet address
- Asset type
- Position ID
- Outstanding debt
- Health factor
- Current LTV
- Loan status
- Missed payments

**Actions Available:**
- Sort by health factor (lowest first)
- Filter by status (ACTIVE, DEFAULTED)
- Liquidate positions

---

### Manual Liquidation

**API:** `POST /admin/solvency/liquidate/{positionId}`

**Triggers:**
- Health factor < 100%
- Status = DEFAULTED (3+ missed payments)

**Process:**
1. Backend validates liquidation criteria
2. Calls liquidation function on-chain
3. Collateral seized
4. Position marked LIQUIDATED
5. OAID credit revoked

---

### Mark Missed Payment (Emergency)

**Script:** `admin-mark-missed-payment.js`

**Purpose:** Manually mark a payment as missed

**Usage:**
```bash
ADMIN_KEY=0x... node scripts/admin-mark-missed-payment.js <position_id>
```

**On-Chain:** `markMissedPayment(positionId)` - SolvencyVault

---

## 🛠️ Scripts Available

### 1. deposit-to-solvency-vault.js
**Purpose:** Deposit RWA tokens to create position and credit line

**Usage:**
```bash
INVESTOR_KEY=0x... node scripts/deposit-to-solvency-vault.js <asset_id> <amount>
```

**Example:**
```bash
INVESTOR_KEY=0x1234... node scripts/deposit-to-solvency-vault.js 4c81f5c6... 90
```

**Flow:**
1. Authenticate with backend
2. Fetch asset details from backend
3. Check RWA token balance
4. Approve SolvencyVault
5. **On-Chain:** `depositCollateral(token, amount, valueUSD, RWA, true)`
6. Parse `PositionCreated` event
7. **API:** `POST /solvency/sync-position`
8. Display position summary
9. **API:** `GET /solvency/oaid/my-credit` (verify)

---

### 2. borrow-solvency-loan.js
**Purpose:** Borrow USDC with auto-calculated maturity based on asset due date

**Usage:**
```bash
INVESTOR_KEY=0x... node scripts/borrow-solvency-loan.js <position_id> <amount> <installments>
```

**Example:**
```bash
INVESTOR_KEY=0x1234... node scripts/borrow-solvency-loan.js 1 5000 3
```

**Flow:**
1. Authenticate with backend
2. **API:** `GET /solvency/position/{positionId}`
3. **API:** `GET /assets/token/{tokenAddress}` (find asset)
4. Calculate loan duration from asset due date
5. **On-Chain:** `borrowUSDC(positionId, amount, duration, installments)`
6. Display loan terms

---

### 3. repay-solvency-loan.js
**Purpose:** Repay loan installment

**Usage:**
```bash
INVESTOR_KEY=0x... node scripts/repay-solvency-loan.js <position_id> [amount]
```

**Example:**
```bash
INVESTOR_KEY=0x1234... node scripts/repay-solvency-loan.js 1 500
```

**Flow:**
1. Authenticate with backend
2. **API:** `GET /solvency/position/{positionId}/schedule`
3. Display repayment schedule
4. **On-Chain (View):** `getOutstandingDebt(positionId)` - SeniorPool
5. Check USDC balance
6. Approve USDC
7. **On-Chain:** `repayLoan(positionId, amount)`
8. Parse `LoanRepaid` event

**Info Mode:** Omit amount to view schedule only

---

### 4. check-oaid-credit.js
**Purpose:** View OAID credit stats directly from blockchain

**Usage:**
```bash
node scripts/check-oaid-credit.js [userAddress]
```

**Example:**
```bash
node scripts/check-oaid-credit.js 0x23e67597f0898f747Fa3291C8920168adF9455D0
```

**Flow:**
1. **On-Chain:** `isUserRegistered(user)` - OAID
2. **On-Chain:** `getTotalCreditLimit(user)` - OAID
3. **On-Chain:** `getTotalAvailableCredit(user)` - OAID
4. **On-Chain:** `getUserCreditLines(user)` - OAID
5. For each credit line:
   - **On-Chain:** `getCreditLine(creditLineId)` - OAID
6. Display credit summary and individual lines

---

### 5. admin-mark-missed-payment.js
**Purpose:** Admin script to manually mark missed payment

**Usage:**
```bash
ADMIN_KEY=0x... node scripts/admin-mark-missed-payment.js <position_id>
```

**Example:**
```bash
ADMIN_KEY=0xadmin... node scripts/admin-mark-missed-payment.js 1
```

**Flow:**
1. **On-Chain:** `markMissedPayment(positionId)` - SolvencyVault
2. Parse `MissedPaymentMarked` event

---

## 📊 Data Flow Summary

### Deposit Flow
```
User Action → approve() [RWA Token]
           → depositCollateral() [SolvencyVault]
           → PositionCreated Event
           → POST /solvency/sync-position [Backend]
           → Database: Position + OAID Credit Line Created
```

### Borrow Flow
```
User Action → GET /solvency/oaid/my-credit [Backend]
           → POST /solvency/borrow [Backend]
           → borrowUSDC() [SolvencyVault via Backend]
           → Database: Repayment Schedule Initialized
           → Database: OAID Credit Updated
```

### Repay Flow
```
User Action → approve() [USDC]
           → POST /solvency/repay [Backend]
           → repayLoan() [SolvencyVault via Backend]
           → Database: Schedule Updated
           → Database: OAID Credit Refreshed
```

### Liquidation Flow
```
Admin Action → POST /admin/solvency/liquidate/{id} [Backend]
            → liquidate() [SolvencyVault via Backend]
            → Database: Position → LIQUIDATED
            → Database: OAID Credit Revoked
```

---

## ✅ Hard Rules Implemented

1. ❌ **NO deposit UI on Borrow page** - Deposit only in Portfolio
2. ❌ **NO borrowing without credit** - Blocking message shown
3. ❌ **NO frontend credit math** - All calculations from backend
4. ✅ **Backend + contracts = source of truth** - UI reflects API state only
5. ✅ **Mandatory backend sync** - After every on-chain transaction
6. ✅ **Repay defaults to next installment** - Pre-filled in modal
7. ✅ **Admin enforces liquidation** - Only via admin endpoints

---

## 🎯 Implementation Summary

**Portfolio creates credit. Borrow consumes it. Admin enforces it.**

**Total Pages Modified/Created:** 2
- Borrow Page (fully refactored)
- Portfolio Page (enhanced)

**Total Components Created:** 2
- MyLoansTable (enhanced with schedule)
- RepayLoanModal (new)

**Total API Endpoints Added:** 6
- `getPositionSchedule()`
- `borrowUSDC()` (backend)
- `repayLoan()` (backend)
- `getAdminLoans()`
- `liquidatePosition()`
- Existing: `getOAIDCredit()`, `getMyPositions()`, `syncPosition()`

**Total On-Chain Functions Used:** 13
- ERC20: `approve()` (x2 - Token & USDC)
- SolvencyVault: `depositCollateral()`, `borrowUSDC()`, `repayLoan()`, `withdrawCollateral()`, `positions()`, `markMissedPayment()`
- OAID: `isUserRegistered()`, `getTotalCreditLimit()`, `getTotalAvailableCredit()`, `getUserCreditLines()`, `getCreditLine()`
- SeniorPool: `getOutstandingDebt()`

**Total Scripts:** 5
- deposit-to-solvency-vault.js
- borrow-solvency-loan.js
- repay-solvency-loan.js
- check-oaid-credit.js
- admin-mark-missed-payment.js

---

*End of Implementation Documentation*
