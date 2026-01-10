# SOLVENCY VAULT VERIFICATION AUDIT REPORT

**Date**: January 6, 2026
**Auditor**: System Architect
**Status**: 🔴 **CRITICAL ISSUES FOUND**

---

## EXECUTIVE SUMMARY

After comprehensive verification of the Solvency Vault implementation against `Solvency_docs.md`, **CRITICAL MISMATCHES** have been identified that violate core user experience requirements and logical flow correctness.

### Critical Findings:
1. ❌ **BROKEN STATE MODEL**: "Borrow More" shown for deposit-only positions (no debt)
2. ❌ **MISSING FUNCTIONALITY**: No "Add Collateral" capability
3. ❌ **MISSING UI COMPONENT**: No "My Loans" table in Portfolio
4. ⚠️ **API ARCHITECTURE MISMATCH**: Doc specifies backend APIs, implementation uses direct contract calls
5. ❌ **SEMANTIC ERRORS**: Button labels don't match user state

---

## PART 1: API & TYPE VERIFICATION

### API Alignment Table

| API Endpoint | Expected (Solvency_docs.md) | Actual Implementation | Status |
|---|---|---|---|
| `POST /solvency/deposit` | Lines 386-413 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| `POST /solvency/borrow` | Lines 416-441 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| `POST /solvency/repay` | Lines 443-467 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| `POST /solvency/withdraw` | Lines 470-492 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| `GET /solvency/positions/my` | Lines 494-531 | ✅ Implemented | ✅ OK |
| `GET /solvency/position/:id` | Lines 638-677 | ✅ Implemented | ✅ OK |
| `POST /solvency/sync-position` | Implied (script line 330) | ✅ Implemented | ✅ OK |
| `GET /solvency/oaid/my-credit` | Referenced | ✅ Implemented | ✅ OK |
| `GET /marketplace/portfolio` | Used in implementation | ✅ Implemented | ✅ OK |
| `GET /assets/{assetId}` | Used in implementation | ✅ Implemented | ✅ OK |

### Architecture Analysis

**DOCUMENTED FLOW** (Solvency_docs.md lines 1072-1102):
```typescript
// User calls backend API
const response = await fetch('/api/solvency/deposit', {
  method: 'POST',
  body: JSON.stringify({
    tokenAddress,
    amount,
    valueUSD,
    tokenType
  })
});
```

**ACTUAL IMPLEMENTATION**:
```typescript
// User calls smart contract DIRECTLY
const tx = await vault.depositCollateral(...);
const receipt = await tx.wait();

// Extract positionId from event
const positionId = parsePositionCreatedEvent(receipt);

// THEN sync with backend
await solvencyService.syncPosition({
  positionId,
  txHash: receipt.hash,
  blockNumber: receipt.blockNumber
});
```

**VERDICT**:
- ⚠️ **ARCHITECTURAL DIVERGENCE**: Documentation describes backend-mediated flow, implementation uses direct contract interaction + sync
- ✅ **FUNCTIONALLY EQUIVALENT**: Both approaches work, but doc is misleading
- 🔧 **RECOMMENDATION**: Update documentation to match actual implementation OR implement backend-mediated endpoints

---

## PART 2: INVESTOR FLOW VALIDATION (UX + LOGIC)

### CRITICAL ISSUE #1: BROKEN STATE MODEL

**Location**: `src/pages/borrow/BorrowPage.tsx:324-331`

**Problem**: "Borrow More" button appears for ALL positions, including deposit-only positions with NO DEBT.

**Code**:
```tsx
{/* Line 324-331 */}
<button
  onClick={() => handleDirectBorrow(position)}
  disabled={isCritical || parseFloat(formattedPosition.availableCredit.replace(/[^0-9.-]+/g,"")) <= 0}
  className="..."
>
  <span>Borrow More</span>  {/* ❌ WRONG - assumes existing debt */}
  <ArrowRight className="w-4 h-4" />
</button>
```

**Evidence from Documentation**:
```json
// Solvency_docs.md lines 516-522
{
  "positionId": 1,
  "usdcBorrowed": "0",        // ✅ NO DEBT YET
  "outstandingDebt": "0",
  "healthFactor": 0,          // ✅ 0 = no debt
  "status": "ACTIVE",
  "maxBorrowCapacity": "7000000000"
}
```

**CORRECT FLOW** (from docs lines 88-103):
```
1. User deposits collateral
   ↓
2. Position becomes ACTIVE with debt = 0  ← COLLATERAL-ONLY STATE
   ↓
3. User can CHOOSE to borrow (not automatic)
   ↓
4. If user borrows → position now has debt
   ↓
5. NOW user can "Borrow More" (against existing debt)
```

**WHAT IS WRONG**:
- Showing "Borrow More" when `usdcBorrowed === "0"` is **semantically incorrect**
- Creates confusion: user thinks they already borrowed
- Violates mental model: "More" implies "additional to existing"

**WHAT SHOULD HAPPEN**:
```tsx
// CORRECT IMPLEMENTATION
{position.usdcBorrowed === "0" ? (
  <>
    <button onClick={() => handleBorrow(position)}>
      <span>Borrow</span>  {/* First-time borrow */}
    </button>
    <button onClick={() => handleAddCollateral(position)}>
      <span>Add Collateral</span>  {/* Can add anytime */}
    </button>
  </>
) : (
  <>
    <button onClick={() => handleBorrowMore(position)}>
      <span>Borrow More</span>  {/* Additional borrow */}
    </button>
    <button onClick={() => handleRepay(position)}>
      <span>Repay</span>
    </button>
    <button onClick={() => handleAddCollateral(position)}>
      <span>Add Collateral</span>  {/* Still available */}
    </button>
  </>
)}
```

---

### CRITICAL ISSUE #2: MISSING "ADD COLLATERAL" FUNCTIONALITY

**Requirement** (from audit prompt):
> User **can always add more collateral**:
> - Before borrowing
> - After borrowing
>
> "Add Collateral" button:
> - ❌ Must NOT be removed after borrowing
> - ❌ Must NOT be incorrectly hidden based on loan state

**Current Implementation**: `src/pages/borrow/BorrowPage.tsx:323-331`
- ✅ Shows "Borrow More" button
- ❌ **NO "Add Collateral" button**

**Analysis**:
1. Checked `BorrowPage.tsx` - no collateral addition UI
2. Checked modals - only `DepositCollateralModal` (for NEW positions)
3. Checked smart contract ABI - only `depositCollateral(...)` which creates NEW position

**Problem**:
- `depositCollateral()` creates a **NEW** position, not add to existing
- No mechanism to add collateral to existing position
- This violates critical requirement: "can always add more collateral"

**Impact**:
- User deposits $10k collateral, borrows $5k
- Collateral value drops, health factor approaches 110%
- User wants to add $2k more collateral to improve health
- ❌ **CANNOT DO THIS** - no UI or contract function available

**Solution Required**:
1. **If contract supports it**: Implement "Add Collateral to Position" UI
2. **If contract doesn't support it**: Need to call `depositCollateral()` again → creates new position → user manages multiple positions for same asset
3. **Recommended**: Add `addCollateralToPosition(uint256 positionId, uint256 amount)` to contract

---

### CRITICAL ISSUE #3: MISSING "MY LOANS" TABLE

**Requirement** (from audit prompt):
> The table MUST correctly show (for borrowed positions):
> - Collateral token (asset locked)
> - Borrowed token (USDC)
> - Borrowed amount
> - Outstanding debt (including interest)
> - Health factor
> - Position ID
> - Status (ACTIVE / WARNING / LIQUIDATABLE)

**Current Implementation**: `src/pages/portfolio/Portfolio.page.tsx`
- Checked for keywords: "loan", "debt", "borrow"
- Found: Only 1 match at line 419 (navigate to /borrow page)
- ❌ **NO "My Loans" TABLE EXISTS**

**Evidence**:
```bash
$ grep -n "loan\|Loan\|debt\|Debt\|borrow" src/pages/portfolio/Portfolio.page.tsx
419:              onClick={() => navigate('/borrow')}
```

**What Should Exist**:
```tsx
{/* Portfolio.page.tsx */}
<section>
  <h2>My Loans</h2>
  <table>
    <thead>
      <tr>
        <th>Position ID</th>
        <th>Collateral Token</th>
        <th>Collateral Amount</th>
        <th>Borrowed (USDC)</th>
        <th>Outstanding Debt</th>
        <th>Interest Accrued</th>
        <th>Health Factor</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {positions
        .filter(p => parseFloat(p.usdcBorrowed) > 0)  // Only show BORROWED positions
        .map(position => (
          <tr key={position.positionId}>
            <td>#{position.positionId}</td>
            <td>{position.collateralToken.symbol}</td>
            <td>{formatTokenAmount(position.collateralAmount)}</td>
            <td>${formatUSD(position.usdcBorrowed)}</td>
            <td>${formatUSD(position.outstandingDebt)}</td>
            <td>${formatUSD(position.interestAccrued)}</td>
            <td className={getHealthColor(position.healthFactor)}>
              {formatHealthFactor(position.healthFactor)}
            </td>
            <td>
              <StatusBadge status={position.healthStatus} />
            </td>
            <td>
              <button onClick={() => repay(position)}>Repay</button>
              <button onClick={() => addCollateral(position)}>Add Collateral</button>
            </td>
          </tr>
        ))
      }
    </tbody>
  </table>
</section>
```

**Impact**:
- Users cannot see their loan positions in Portfolio
- No centralized view of outstanding debts
- No quick access to repayment or collateral management
- Poor UX for users with multiple positions

---

## PART 3: COLLATERAL MANAGEMENT RULES

### Rule Verification

| Rule | Expected | Actual | Status |
|---|---|---|---|
| Can add collateral BEFORE borrowing | ✅ | ❌ No UI | ❌ FAIL |
| Can add collateral AFTER borrowing | ✅ | ❌ No UI | ❌ FAIL |
| "Add Collateral" button always visible | ✅ | ❌ Doesn't exist | ❌ FAIL |
| Adding collateral updates position | ✅ | N/A | ⚠️ UNKNOWN |
| Adding collateral updates max borrow | ✅ | N/A | ⚠️ UNKNOWN |
| Adding collateral updates OAID credit | ✅ | N/A | ⚠️ UNKNOWN |

### Smart Contract Analysis

**Documented Functions** (Solvency_docs.md lines 227-297):
```solidity
function depositCollateral(...) external returns (uint256 positionId)
  ↳ Creates NEW position

function borrowUSDC(uint256 positionId, ...) external
  ↳ Borrow against existing position

function repayLoan(uint256 positionId, ...) external
  ↳ Repay debt

function withdrawCollateral(uint256 positionId, ...) external
  ↳ Withdraw after full repayment (debt must be 0)
```

**MISSING**:
```solidity
function addCollateralToPosition(uint256 positionId, uint256 amount) external
  ↳ ❌ DOES NOT EXIST
```

**Workaround**:
- User must call `depositCollateral()` again → creates SECOND position
- User now manages multiple positions for same token
- Not ideal but functional

**Recommendation**:
1. Add `addCollateralToPosition()` to smart contract
2. Update frontend to support both:
   - Initial deposit (new position)
   - Additional deposit (to existing position)

---

## PART 4: STATE MODELLING

### User State Matrix

| State | Collateral | Debt | Health Factor | Expected UI | Actual UI | Status |
|---|---|---|---|---|---|---|
| **New User** | 0 | 0 | 0 | "Deposit Collateral" button | ✅ Correct | ✅ OK |
| **Deposited (No Debt)** | > 0 | 0 | 0 | "Borrow" + "Add Collateral" | ❌ Shows "Borrow More" | ❌ WRONG |
| **Active Loan** | > 0 | > 0 | > 0 | "Borrow More" + "Repay" + "Add Collateral" | ❌ Only "Borrow More" | ❌ WRONG |
| **Fully Repaid** | > 0 | 0 | 0 | "Withdraw" + "Borrow" | ❌ Shows "Borrow More" | ❌ WRONG |

### Correct State Implementation

```typescript
// POSITION STATE ENUM
enum PositionState {
  COLLATERAL_ONLY = 'COLLATERAL_ONLY',  // debt === 0
  ACTIVE_LOAN = 'ACTIVE_LOAN',           // debt > 0, HF >= 11000
  WARNING = 'WARNING',                    // debt > 0, HF 10000-11000
  LIQUIDATABLE = 'LIQUIDATABLE',          // debt > 0, HF < 10000
  FULLY_REPAID = 'FULLY_REPAID'          // was borrowed, now debt === 0
}

function getPositionState(position: Position): PositionState {
  const debt = parseFloat(position.usdcBorrowed);
  const healthFactor = position.healthFactor;

  if (debt === 0 && parseFloat(position.collateralAmount) > 0) {
    return PositionState.COLLATERAL_ONLY;
  }

  if (debt > 0) {
    if (healthFactor < 10000) return PositionState.LIQUIDATABLE;
    if (healthFactor < 11000) return PositionState.WARNING;
    return PositionState.ACTIVE_LOAN;
  }

  return PositionState.COLLATERAL_ONLY;
}

// RENDER BASED ON STATE
function renderPositionActions(position: Position) {
  const state = getPositionState(position);

  switch (state) {
    case PositionState.COLLATERAL_ONLY:
      return (
        <>
          <button onClick={() => borrow(position)}>Borrow</button>
          <button onClick={() => addCollateral(position)}>Add Collateral</button>
          <button onClick={() => withdraw(position)}>Withdraw</button>
        </>
      );

    case PositionState.ACTIVE_LOAN:
    case PositionState.WARNING:
      return (
        <>
          <button onClick={() => borrowMore(position)}>Borrow More</button>
          <button onClick={() => repay(position)}>Repay</button>
          <button onClick={() => addCollateral(position)}>Add Collateral</button>
        </>
      );

    case PositionState.LIQUIDATABLE:
      return (
        <>
          <button onClick={() => repay(position)} className="urgent">Repay Now</button>
          <button onClick={() => addCollateral(position)}>Add Collateral</button>
          <span className="warning">Position at risk of liquidation!</span>
        </>
      );

    default:
      return null;
  }
}
```

---

## PART 5: DATA FLOW VERIFICATION

### Deposit Flow

**Expected** (Solvency_docs.md lines 88-96):
```
1. User approves token spending to SolvencyVault
2. User calls deposit endpoint via API  ← Documentation says use API
3. Vault transfers tokens from user to vault custody
4. Position created in database with LTV calculations
5. OAID credit line created/updated with 70% LTV
6. User notified of successful deposit
```

**Actual Implementation**:
```
1. User approves token spending to SolvencyVault ✅
2. User calls depositCollateral() DIRECTLY on contract ⚠️ Different
3. Extract positionId from PositionCreated event ✅
4. Call POST /solvency/sync-position ✅
5. Backend creates database record ✅
6. Frontend refreshes position list ✅
```

**Verdict**: Functional but different architecture

### Borrow Flow

**Expected** (Solvency_docs.md lines 97-103):
```
1. User requests USDC loan via API  ← Documentation says use API
2. Backend validates health factor allows borrowing
3. Vault borrows USDC from SeniorPool
4. USDC transferred to user's wallet
5. Position updated with new debt amount
```

**Actual Implementation**:
```
1. User calls borrowUSDC() DIRECTLY on contract ⚠️ Different
2. Contract validates health factor (no backend check) ⚠️
3. USDC transferred to user's wallet ✅
4. Call POST /solvency/sync-position ✅
5. Backend updates database record ✅
```

**Issue**: Documentation says "via API" but implementation uses direct contract calls. This bypasses potential backend validation.

---

## MISMATCH REPORT SUMMARY

### 🔴 CRITICAL ISSUES

1. **STATE MODEL BROKEN**
   - Where: `BorrowPage.tsx:329`
   - Issue: "Borrow More" shown for deposit-only positions
   - Impact: Confusing UX, semantically incorrect
   - Fix: Implement state-based button rendering

2. **MISSING FUNCTIONALITY**
   - Where: Entire BorrowPage
   - Issue: No "Add Collateral" capability
   - Impact: Users cannot improve health factor by adding collateral
   - Fix: Add UI + verify contract supports it

3. **MISSING UI COMPONENT**
   - Where: Portfolio page
   - Issue: No "My Loans" table
   - Impact: No centralized loan management view
   - Fix: Create MyLoansTable component

### ⚠️ ARCHITECTURAL MISMATCHES

4. **API VS CONTRACT ARCHITECTURE**
   - Where: Documentation vs Implementation
   - Issue: Docs say "call API", implementation calls contracts directly
   - Impact: Documentation is misleading
   - Fix: Update docs OR implement backend-mediated endpoints

5. **SEMANTIC BUTTON TEXT**
   - Where: BorrowPage.tsx:329
   - Issue: "Borrow More" when debt is 0
   - Impact: Misleading label
   - Fix: Change to "Borrow" for first-time

---

## ACTION ITEMS

### MUST FIX (Blocking Issues)

1. **Implement State-Based UI**
   - File: `src/pages/borrow/BorrowPage.tsx`
   - Change: Add position state detection
   - Show different buttons based on debt status:
     - Debt = 0: "Borrow", "Add Collateral", "Withdraw"
     - Debt > 0: "Borrow More", "Repay", "Add Collateral"

2. **Add Collateral Management**
   - Files: Create `src/pages/borrow/components/AddCollateralModal.tsx`
   - Verify: Check if contract has addCollateralToPosition()
   - If not: Allow creating additional position for same token
   - Show: "Add Collateral" button on ALL position cards

3. **Create My Loans Table**
   - File: `src/pages/portfolio/Portfolio.page.tsx`
   - Component: `src/components/portfolio/MyLoansTable.tsx`
   - Data: Fetch positions with debt > 0
   - Columns: Position ID, Collateral, Borrowed, Debt, Interest, Health, Status, Actions

### SHOULD FIX (Important)

4. **Update Documentation**
   - File: `docs/Solvency_docs.md`
   - Change: Reflect actual direct contract interaction architecture
   - Or: Implement backend-mediated deposit/borrow/repay/withdraw endpoints

5. **Add Missing Functionality**
   - Repay loan UI
   - Withdraw collateral UI (after full repayment)
   - Interest accrual display
   - Liquidation warnings

### COULD FIX (Nice to Have)

6. **Improve State Management**
   - Create PositionState enum
   - Create position state machine
   - Add state transition validation

---

## CORRECT FLOW (Step-by-Step)

### First-Time User (Deposit Only)

```
1. User connects wallet
   ↓
2. BorrowPage → No positions found
   ↓
3. Click "Deposit Collateral"
   ↓
4. DepositCollateralModal → Select asset, enter amount
   ↓
5. Approve → Deposit → Sync
   ↓
6. Position created with debt = 0
   ↓
7. Position card shows:
   ✅ "Borrow" button (not "Borrow More")
   ✅ "Add Collateral" button
   ✅ "Withdraw" button
```

### User Borrows

```
1. User sees position card (debt = 0)
   ↓
2. Click "Borrow" (not "Borrow More")
   ↓
3. DirectBorrowModal → Enter amount, see health factor
   ↓
4. Borrow → Sync
   ↓
5. Position updated with debt > 0
   ↓
6. Position card NOW shows:
   ✅ "Borrow More" button
   ✅ "Repay" button
   ✅ "Add Collateral" button (still visible)
   ↓
7. Portfolio → "My Loans" table shows this position
```

### User Adds Collateral

```
1. User sees position (with or without debt)
   ↓
2. Click "Add Collateral"
   ↓
3. AddCollateralModal → Enter amount
   ↓
4. Approve → Deposit → Sync
   ↓
5. Position updated:
   - Collateral increased
   - Max borrow capacity increased
   - Health factor improved (if debt exists)
   - OAID credit limit increased
```

---

## CONCLUSION

The current implementation has **CRITICAL UX FLAWS** that violate the documented user flow and logical position state management.

**Key Problems**:
1. ❌ Shows "Borrow More" for positions with no debt
2. ❌ Missing "Add Collateral" functionality entirely
3. ❌ Missing "My Loans" table in Portfolio
4. ⚠️ Architecture differs from documentation (but functionally works)

**Impact**:
- Confusing user experience
- Cannot manage collateral properly
- Missing critical risk management features
- Documentation doesn't match implementation

**Next Steps**:
1. Fix state-based button rendering IMMEDIATELY
2. Implement "Add Collateral" functionality
3. Create "My Loans" table
4. Decide on API architecture (direct vs mediated)
5. Update documentation to match reality

**Recommended Priority**:
1. State-based UI (1 day)
2. Add Collateral (2-3 days)
3. My Loans Table (1 day)
4. Documentation update (1 day)

---

**END OF AUDIT REPORT**
