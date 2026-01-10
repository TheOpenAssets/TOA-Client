
## Complete Lifecycle Flow

### Phase 1: Deposit Collateral

**Script**: `scripts/deposit-to-solvency-vault.js`

**Command**:
```bash
INVESTOR_KEY=0x... node scripts/deposit-to-solvency-vault.js <asset_id> <amount>
```

**Example**:
```bash
INVESTOR_KEY=0x4dd8f6b5... node scripts/deposit-to-solvency-vault.js \
  aff1072c-24d6-463f-97de-2717557d3afd 100
```

**What Happens**:
1. ✅ Script authenticates with backend
2. ✅ Fetches asset details (token address, price)
3. ✅ Approves SolvencyVault to spend tokens
4. ✅ Calls `SolvencyVault.depositCollateral(amount, issueOAID)`
5. ✅ Blockchain emits `PositionCreated` event
6. ✅ Script syncs with backend `/solvency/position/sync`
7. ✅ MongoDB record created

**Blockchain State After**:
```solidity
Position {
  user: 0x580F5b09765E71D64613c8F4403234f8790DD7D3,
  collateralToken: 0xbC30793128bE54521cA80550D717382e9469e4ba,
  collateralAmount: 100000000000000000000,  // 100 tokens
  usdcBorrowed: 0,
  tokenValueUSD: 85000000,                  // $85.00 (6 decimals)
  createdAt: 1736318735,
  active: true,
  tokenType: INVOICE (2)
}

RepaymentPlan {
  isActive: false,
  numberOfInstallments: 0,
  installmentsPaid: 0,
  installmentInterval: 0,
  missedPayments: 0,
  nextPaymentDue: 0
}
```

**MongoDB Document After**:
```json
{
  "positionId": 1,
  "userAddress": "0x580F5b09765E71D64613c8F4403234f8790DD7D3",
  "collateralTokenAddress": "0xbC30793128bE54521cA80550D717382e9469e4ba",
  "collateralTokenType": "INVOICE",
  "collateralAmount": "100000000000000000000",
  "tokenValueUSD": "85000000",
  "usdcBorrowed": "0",
  "initialLTV": 6000,
  "currentHealthFactor": 2147483647,
  "healthStatus": "HEALTHY",
  "status": "ACTIVE",
  "totalRepaid": "0",
  "loanDuration": 0,
  "numberOfInstallments": 0,
  "installmentInterval": 0,
  "installmentsPaid": 0,
  "missedPayments": 0,
  "repaymentSchedule": [],
  "isDefaulted": false,
  "oaidCreditIssued": true,
  "depositTxHash": "0xa7f773f30df011d91b21f9578b19be2b4911746e986d86b186fc60211fcc5ea9",
  "depositBlockNumber": 33153741,
  "createdAt": "2026-01-08T07:05:35.542Z",
  "updatedAt": "2026-01-08T07:05:35.542Z"
}
```

---

### Phase 2: Borrow Against Collateral

**Script**: `scripts/borrow-solvency-loan.js`

**Command**:
```bash
INVESTOR_KEY=0x... node scripts/borrow-solvency-loan.js <position_id> <amount_usdc> <installments>
```

**Example**:
```bash
INVESTOR_KEY=0x4dd8f6b5... node scripts/borrow-solvency-loan.js 1 50 6
```

**What Happens**:
1. ✅ Script authenticates with backend
2. ✅ Fetches position details
3. ✅ Finds linked asset to determine maturity date
4. ✅ Calculates loan duration (asset.dueDate - now)
5. ✅ Calls `SolvencyVault.borrowUSDC(positionId, amount, duration, installments)`
6. ✅ Blockchain emits:
   - `USDCBorrowed(positionId, amount, totalDebt)`
   - `RepaymentPlanCreated(positionId, duration, installments, interval)`
7. ✅ **Event Listener** catches events
8. ✅ **Event Processor** updates MongoDB automatically

**Blockchain State After**:
```solidity
Position {
  user: 0x580F5b09765E71D64613c8F4403234f8790DD7D3,
  collateralToken: 0xbC30793128bE54521cA80550D717382e9469e4ba,
  collateralAmount: 100000000000000000000,
  usdcBorrowed: 50000000,                   // $50.00 borrowed ✅
  tokenValueUSD: 85000000,
  createdAt: 1736318735,
  active: true,
  tokenType: INVOICE (2)
}

RepaymentPlan {
  isActive: true,                           // ✅ Plan activated
  numberOfInstallments: 6,                  // ✅ 6 payments
  installmentsPaid: 0,
  installmentInterval: 356335,              // ✅ ~4.1 days
  missedPayments: 0,
  nextPaymentDue: 1736675070                // ✅ First payment due
}
```

**SeniorPool State**:
```solidity
outstandingDebt[1] = 50000000  // $50.00 principal
```

**MongoDB Document After** (🎉 **AUTO-SYNCED via Events**):
```json
{
  "positionId": 1,
  "userAddress": "0x580F5b09765E71D64613c8F4403234f8790DD7D3",
  "collateralTokenAddress": "0xbC30793128bE54521cA80550D717382e9469e4ba",
  "collateralTokenType": "INVOICE",
  "collateralAmount": "100000000000000000000",
  "tokenValueUSD": "85000000",
  "usdcBorrowed": "50000000",                    // ✅ UPDATED
  "initialLTV": 6000,
  "currentHealthFactor": 17000,                  // ✅ UPDATED (170%)
  "healthStatus": "HEALTHY",
  "status": "ACTIVE",
  "totalRepaid": "0",
  "loanDuration": 2138010,                       // ✅ UPDATED (~24.75 days)
  "numberOfInstallments": 6,                     // ✅ UPDATED
  "installmentInterval": 356335,                 // ✅ UPDATED (~4.1 days)
  "installmentsPaid": 0,
  "missedPayments": 0,
  "nextPaymentDueDate": "2026-01-12T18:11:10Z",  // ✅ UPDATED
  "repaymentSchedule": [                         // ✅ UPDATED
    {
      "installmentNumber": 1,
      "dueDate": "2026-01-12T18:11:10Z",
      "amount": "8333333",
      "status": "PENDING"
    },
    {
      "installmentNumber": 2,
      "dueDate": "2026-01-16T22:16:45Z",
      "amount": "8333333",
      "status": "PENDING"
    },
    // ... 4 more installments
  ],
  "isDefaulted": false,
  "oaidCreditIssued": true,
  "depositTxHash": "0xa7f773...",
  "depositBlockNumber": 33153741,
  "createdAt": "2026-01-08T07:05:35.542Z",
  "updatedAt": "2026-01-08T14:06:28.000Z"        // ✅ UPDATED
}
```

**Event Processing Logs**:
```
[EventListenerService] Watching SolvencyVault at 0x3b3d70...
[EventProcessor] Processing SolvencyVault borrow for position 1: borrowed 50000000, total debt 50000000
[SolvencyPositionService] Position 1 synced with blockchain
[EventProcessor] ✅ Position 1 synced after borrow event
[EventProcessor] Processing repayment plan for position 1: 6 installments, interval 356335s
[EventProcessor] ✅ Position 1 repayment plan updated
```

---

### Phase 3: Repay Installment

**Script**: `scripts/repay-solvency-loan.js`

**Command**:
```bash
INVESTOR_KEY=0x... node scripts/repay-solvency-loan.js <position_id> <amount_usdc>
```

**Example**:
```bash
INVESTOR_KEY=0x4dd8f6b5... node scripts/repay-solvency-loan.js 1 17
```

**What Happens**:
1. ✅ Script authenticates with backend
2. ✅ Checks outstanding debt
3. ✅ Approves SeniorPool to spend USDC
4. ✅ Calls `SeniorPool.repayLoan(positionId, amount)`
5. ✅ Blockchain emits:
   - `LoanRepaid(positionId, amountPaid, principal, interest, remainingDebt)`
6. ✅ **Event Listener** catches event
7. ✅ **Event Processor** updates MongoDB

**Blockchain State After**:
```solidity
Position {
  usdcBorrowed: 33000000,  // $50 - $17 = $33 remaining ✅
  // ... other fields unchanged
}

RepaymentPlan {
  isActive: true,
  numberOfInstallments: 6,
  installmentsPaid: 1,      // ✅ Incremented
  installmentInterval: 356335,
  missedPayments: 0,
  nextPaymentDue: 1737031405  // ✅ Advanced to next installment
}
```

**SeniorPool State**:
```solidity
outstandingDebt[1] = 33000000  // $33.00 remaining
```

**MongoDB Document After** (🎉 **AUTO-SYNCED**):
```json
{
  "positionId": 1,
  "usdcBorrowed": "33000000",                    // ✅ UPDATED
  "totalRepaid": "17000000",                     // ✅ UPDATED
  "installmentsPaid": 1,                         // ✅ UPDATED
  "lastRepaymentTime": "2026-01-08T15:30:00Z",   // ✅ UPDATED
  "currentHealthFactor": 25757,                  // ✅ UPDATED (257%)
  "repaymentSchedule": [
    {
      "installmentNumber": 1,
      "dueDate": "2026-01-12T18:11:10Z",
      "amount": "8333333",
      "status": "PAID",                          // ✅ UPDATED
      "paidAt": "2026-01-08T15:30:00Z"           // ✅ ADDED
    },
    {
      "installmentNumber": 2,
      "dueDate": "2026-01-16T22:16:45Z",
      "amount": "8333333",
      "status": "PENDING"
    },
    // ... remaining installments
  ],
  "updatedAt": "2026-01-08T15:30:05.000Z"
}
```

**Event Processing Logs**:
```
[EventProcessor] Processing SolvencyVault repayment for position 1: paid 17000000, principal 16000000, interest 1000000
[SolvencyPositionService] Position 1 repaid 17000000, remaining debt: 33000000
[EventProcessor] ✅ Position 1 updated after repayment
```

---

### Phase 4: Admin Marks Missed Payment

**Script**: `scripts/admin-mark-missed-payment.js`

**Command** (Admin only):
```bash
ADMIN_KEY=0x... node scripts/admin-mark-missed-payment.js <position_id>
```

**Example**:
```bash
ADMIN_KEY=0x1d12932a... node scripts/admin-mark-missed-payment.js 1
```

**What Happens**:
1. ✅ Admin calls `SolvencyVault.markMissedPayment(positionId)` directly
2. ✅ Blockchain emits:
   - `MissedPaymentMarked(positionId, missedPayments)`
3. ✅ **Event Listener** catches event (🎉 **THIS IS THE FIX!**)
4. ✅ **Event Processor** updates MongoDB automatically

**Blockchain State After**:
```solidity
RepaymentPlan {
  isActive: true,
  numberOfInstallments: 6,
  installmentsPaid: 1,
  installmentInterval: 356335,
  missedPayments: 1,        // ✅ Incremented
  nextPaymentDue: 1737387740  // ✅ Advanced forward
}
```

**MongoDB Document After** (🎉 **AUTO-SYNCED - Previously Broken!**):
```json
{
  "positionId": 1,
  "missedPayments": 1,                           // ✅ UPDATED AUTOMATICALLY!
  "nextPaymentDueDate": "2026-01-20T23:22:20Z",  // ✅ UPDATED
  "repaymentSchedule": [
    {
      "installmentNumber": 1,
      "status": "PAID"
    },
    {
      "installmentNumber": 2,
      "dueDate": "2026-01-16T22:16:45Z",
      "amount": "8333333",
      "status": "MISSED"                         // ✅ UPDATED
    },
    {
      "installmentNumber": 3,
      "dueDate": "2026-01-20T23:22:20Z",
      "amount": "8333333",
      "status": "PENDING"
    },
    // ... remaining installments
  ],
  "updatedAt": "2026-01-08T16:45:00.000Z"
}
```

**Event Processing Logs**:
```
[EventProcessor] Processing missed payment for position 1: total missed = 1
[EventProcessor] ✅ Position 1 marked with 1 missed payments
```

**⚠️ Important**: This script does NOT call backend API. Before the fix, MongoDB was never updated. Now it's synced via events!

---

### Phase 5: Admin Marks Defaulted (3+ Missed)

**Script**: `scripts/admin-mark-defaulted.js`

**Command** (Admin only):
```bash
ADMIN_KEY=0x... node scripts/admin-mark-defaulted.js <position_id>
```

**Prerequisite**: Position must have 3+ missed payments

**What Happens**:
1. ✅ Admin calls `SolvencyVault.markDefaulted(positionId)`
2. ✅ Contract verifies `missedPayments >= 3`
3. ✅ Blockchain emits:
   - `PositionDefaulted(positionId)`
4. ✅ **Event Listener** catches event
5. ✅ **Event Processor** updates MongoDB

**Blockchain State After**:
```solidity
Position {
  active: true,  // Still active, but marked for liquidation
  // ... other fields
}

RepaymentPlan {
  isActive: false,     // ✅ Plan deactivated after default
  missedPayments: 3,
  // ... other fields
}
```

**MongoDB Document After** (🎉 **AUTO-SYNCED**):
```json
{
  "positionId": 1,
  "status": "ACTIVE",                            // Still ACTIVE (not liquidated yet)
  "isDefaulted": true,                           // ✅ UPDATED
  "missedPayments": 3,
  "healthStatus": "LIQUIDATABLE",
  "updatedAt": "2026-01-08T17:00:00.000Z"
}
```

**Event Processing Logs**:
```
[EventProcessor] Processing default for position 1
[EventProcessor] ✅ Position 1 marked as defaulted
```

---

### Phase 6: Admin Liquidates Position

**Script**: `scripts/admin-liquidate-position.js`

**Command** (Admin only):
```bash
ADMIN_KEY=0x... node scripts/admin-liquidate-position.js <position_id>
```

**What Happens**:
1. ✅ Script authenticates with backend
2. ✅ Generates unique marketplace listing ID
3. ✅ Calls `SolvencyVault.liquidatePosition(positionId, marketplaceListingId)`
4. ✅ Blockchain transfers collateral to YieldVault
5. ✅ Blockchain emits:
   - `PositionLiquidated(positionId, marketplaceListingId)`
6. ✅ **Event Listener** catches event
7. ✅ **Event Processor** updates MongoDB
8. ✅ Script also calls backend API `/admin/solvency/liquidate/:id`

**Blockchain State After**:
```solidity
Position {
  collateralAmount: 0,        // ✅ Collateral moved to YieldVault
  active: false,              // ✅ Position closed
  // ... other fields
}

// Collateral now held in YieldVault awaiting settlement
```

**MongoDB Document After** (🎉 **AUTO-SYNCED**):
```json
{
  "positionId": 1,
  "status": "LIQUIDATED",                        // ✅ UPDATED
  "collateralAmount": "0",                       // ✅ UPDATED
  "liquidationTimestamp": "2026-01-08T17:15:00Z", // ✅ ADDED
  "liquidationTxHash": "0x68292e25...",          // ✅ ADDED
  "marketplaceListingId": "0x1a2b3c...",         // ✅ ADDED
  "healthStatus": "LIQUIDATABLE",
  "updatedAt": "2026-01-08T17:15:05.000Z"
}
```

**Event Processing Logs**:
```
[EventProcessor] Processing liquidation for position 1
[SolvencyPositionService] Position 1 marked as liquidated
[EventProcessor] ✅ Position 1 marked as liquidated
```

---

### Phase 7: Settlement (Asset Maturity)

**Automatic Process** triggered by YieldDistributionService when asset matures.

**Manual Trigger** (Admin):
```bash
ADMIN_KEY=0x... node scripts/admin-settle-liquidation.js <position_id>
```

**What Happens**:
1. ✅ YieldVault receives settlement funds from issuer
2. ✅ Admin (or automated service) calls `SolvencyVault.settleLiquidation(positionId)`
3. ✅ Contract burns collateral tokens via YieldVault
4. ✅ Contract claims USDC yield
5. ✅ Contract repays debt to SeniorPool
6. ✅ Contract returns excess to user
7. ✅ Blockchain emits:
   - `LiquidationSettled(positionId, yieldReceived, debtRepaid, userRefund)`
8. ✅ **Event Listener** catches event
9. ✅ **Event Processor** updates MongoDB

**Blockchain State After**:
```solidity
Position {
  collateralAmount: 0,
  active: false,
  // Position fully closed
}

// SeniorPool debt = 0
// User receives refund if yield > debt
```

**MongoDB Document After** (🎉 **AUTO-SYNCED**):
```json
{
  "positionId": 1,
  "status": "SETTLED",                           // ✅ UPDATED
  "settledAt": "2026-02-02T14:18:00Z",           // ✅ ADDED
  "debtRecovered": "33000000",                   // ✅ ADDED (amount repaid to pool)
  "collateralAmount": "0",
  "usdcBorrowed": "0",                           // ✅ Debt cleared
  "updatedAt": "2026-02-02T14:18:05.000Z"
}
```

**Event Processing Logs**:
```
[EventProcessor] Processing liquidation settlement for position 1: yield 98500000, debt repaid 33000000, refund 65500000
[EventProcessor] ✅ Position 1 marked as settled
```

---

## Script Reference

### User Scripts (Investor Operations)

| Script | Purpose | Backend API Called? | Events Emitted | MongoDB Update |
|--------|---------|---------------------|----------------|----------------|
| `deposit-to-solvency-vault.js` | Deposit collateral, create position | ✅ Yes<br>`/solvency/position/sync` | `PositionCreated` | ✅ Via API + Events |
| `borrow-solvency-loan.js` | Borrow USDC against collateral | ❌ No | `USDCBorrowed`<br>`RepaymentPlanCreated` | ✅ Via Events |
| `repay-solvency-loan.js` | Make loan repayment | ❌ No | `LoanRepaid` | ✅ Via Events |

### Admin Scripts (Administrative Operations)

| Script | Purpose | Backend API Called? | Events Emitted | MongoDB Update |
|--------|---------|---------------------|----------------|----------------|
| `admin-mark-missed-payment.js` | Mark payment as missed | ❌ No<br>⚠️ **Use API Instead** | `MissedPaymentMarked` | ✅ Via Events ⭐ |
| `admin-mark-defaulted.js` | Mark position as defaulted | ❌ No<br>⚠️ **Use API Instead** | `PositionDefaulted` | ✅ Via Events ⭐ |
| `admin-liquidate-position.js` | Start liquidation process | ✅ Yes<br>`/admin/solvency/liquidate/:id` | `PositionLiquidated` | ✅ Via API + Events |
| `admin-settle-liquidation.js` | Settle liquidation | ❌ No<br>⚠️ **Use API Instead** | `LiquidationSettled` | ✅ Via Events ⭐ |
| `admin-purchase-liquidation.js` | Purchase liquidated private asset | ✅ Yes<br>`/admin/solvency/position/:id/purchase-liquidation` | `PrivateAssetLiquidationSettled` | ✅ Via API |

⭐ = **Previously broken**, now fixed with event listeners!

### NEW: Backend API Endpoints for Frontend Integration

For frontend integration, **use these backend endpoints instead of direct blockchain scripts**:

| Backend API Endpoint | Replaces Script | Method | Auth Required |
|---------------------|-----------------|--------|---------------|
| `POST /admin/solvency/position/:id/mark-missed-payment` | `admin-mark-missed-payment.js` | Backend API | Admin JWT |
| `POST /admin/solvency/position/:id/mark-defaulted` | `admin-mark-defaulted.js` | Backend API | Admin JWT |
| `POST /admin/solvency/liquidate/:id` | `admin-liquidate-position.js` | Backend API | Admin JWT |
| `POST /admin/solvency/position/:id/settle-liquidation` | `admin-settle-liquidation.js` | Backend API | Admin JWT |

**Why use backend endpoints?**
- ✅ No need to expose admin private keys in frontend
- ✅ Centralized admin operations with proper auth
- ✅ Automatic MongoDB sync via events
- ✅ Better error handling and logging
- ✅ Transaction signing handled server-side securely

See **[Frontend Integration Guide](FRONTEND_INTEGRATION_GUIDE.md)** for complete implementation details.




### Quick Reference Table

| Operation | `status` | `usdcBorrowed` | `missedPayments` | `isDefaulted` | `loanDuration` | `numberOfInstallments` |
|-----------|----------|----------------|------------------|---------------|----------------|------------------------|
| **After Deposit** | `ACTIVE` | `"0"` | `0` | `false` | `0` | `0` |
| **After Borrow** | `ACTIVE` | `> 0` ✅ | `0` | `false` | `> 0` ✅ | `> 0` ✅ |
| **After Repayment** | `ACTIVE` | decreased ✅ | unchanged | `false` | unchanged | unchanged |
| **Full Repayment** | `REPAID` | `"0"` ✅ | any | `false` | unchanged | unchanged |
| **Missed Payment** | `ACTIVE` | unchanged | `+1` ✅ | `false` | unchanged | unchanged |
| **Marked Default** | `ACTIVE` | unchanged | `>= 3` | `true` ✅ | unchanged | unchanged |
| **Liquidated** | `LIQUIDATED` ✅ | unchanged | any | `true` | unchanged | unchanged |
| **Settled** | `SETTLED` ✅ | `"0"` ✅ | any | `true` | unchanged | unchanged |

### Position Status Flow

```
ACTIVE (deposit)
   │
   ├──[borrow]──→ ACTIVE (with debt)
   │                 │
   │                 ├──[repay partially]──→ ACTIVE (reduced debt)
   │                 │
   │                 ├──[repay fully]──→ REPAID
   │                 │
   │                 ├──[miss payment × 1-2]──→ ACTIVE (missedPayments++)
   │                 │
   │                 └──[miss payment × 3+]──→ ACTIVE (isDefaulted=true)
   │                                              │
   │                                              └──[liquidate]──→ LIQUIDATED
   │                                                                    │
   │                                                                    └──[settle]──→ SETTLED
   │
   └──[withdraw all]──→ CLOSED (no debt)
```

### Health Status Flow

```
HEALTHY (healthFactor > 125%)
   │
   └──[price drop/borrow more]──→ WARNING (110% < healthFactor <= 125%)
                                      │
                                      └──[price drop more]──→ LIQUIDATABLE (healthFactor < 110%)
```

---

