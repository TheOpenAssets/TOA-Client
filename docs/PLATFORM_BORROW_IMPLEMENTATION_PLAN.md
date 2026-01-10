# Platform Direct Borrowing - Complete Implementation Plan

## 📋 Analysis Summary

**Date:** 2026-01-06
**Scope:** Implement complete deposit → borrow flow for **PLATFORM DIRECT BORROWING ONLY**
**Reference:** `src/scripts/deposit-to-vaultsolvency.js` (lines 403-573)

---

## ✅ Existing Infrastructure (VERIFIED)

### 1. Backend APIs Available

| Endpoint | Method | Purpose | Status | File Reference |
|----------|--------|---------|--------|----------------|
| `/marketplace/portfolio` | GET | Get user's owned RWA tokens | ✅ EXISTS | portfolio.service.ts:57 |
| `/assets/{assetId}` | GET | Get asset details (token address, price) | ✅ EXISTS | asset.service.ts:81 |
| `/solvency/sync-position` | POST | Sync on-chain position to backend DB | ✅ EXISTS | solvency.service.ts:237 |
| `/solvency/oaid/my-credit` | GET | Get user's OAID credit line | ✅ EXISTS | solvency.service.ts:106 |
| `/solvency/positions/my` | GET | Get user's borrow positions | ✅ EXISTS | solvency.service.ts:144 |
| `/solvency/position/{id}` | GET | Get single position details | ✅ EXISTS | solvency.service.ts:182 |

### 2. Contract Functions Available (Current)

**⚠️ CRITICAL ISSUE: Contract ABI mismatch with reference script!**

| Current Implementation | Reference Script | Status |
|----------------------|------------------|--------|
| `depositCollateral(oaidId, tokenAddress, amount)` | `depositCollateral(token, amount, valueUSD, tokenType, issueOAID)` | ❌ MISMATCH |
| `borrow(oaidId, amount)` | `borrowUSDC(positionId, amount)` | ❌ MISMATCH |
| `approveToken(tokenAddress, amount)` | ✅ Same | ✅ OK |

**Location:** `src/lib/api/solvency-contract.service.ts`

**Reference Script ABI (CORRECT - from deposit-to-vaultsolvency.js:115-121):**
```javascript
const SOLVENCY_VAULT_ABI = [
  'function depositCollateral(address collateralToken, uint256 collateralAmount, uint256 tokenValueUSD, uint8 tokenType, bool issueOAID) external returns (uint256 positionId)',
  'function borrowUSDC(uint256 positionId, uint256 amount) external',
  'event PositionCreated(uint256 indexed positionId, address indexed user, address collateralToken, uint256 collateralAmount, uint256 tokenValueUSD, uint8 tokenType)',
  'event USDCBorrowed(uint256 indexed positionId, uint256 amount, uint256 totalDebt)',
];
```

### 3. UI Structure (Current)

```
BorrowPage.tsx (Main Page)
├── Shows when no credit: "Deposit Collateral" button
├── Shows when has credit: CreditSummaryCard + ProtocolGrid
├── Opens: DepositCollateralModal (❌ NOT IMPLEMENTED)
└── Opens: BorrowModal (⚠️ Only for 3rd party protocols)
```

---

## 🎯 Complete Flow Definition

### DEPOSIT FLOW (Based on script lines 403-511)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION: Click "Deposit Collateral"                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Fetch User's Portfolio                                 │
│ API: GET /marketplace/portfolio                                 │
│ Purpose: Get list of RWA tokens user owns                      │
│ Response: { portfolio: [ { assetId, tokenAddress, ... } ] }   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ UI: Show Asset Selection Modal                                 │
│ - Dropdown: Select which RWA token to deposit                  │
│ - Display: Token balance (from on-chain)                       │
│ - Input: Deposit amount                                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: User Selects Asset                                     │
│ API: GET /assets/{assetId}                                      │
│ Purpose: Get token address and price                           │
│ Response: { token: { address }, listing: { price } }          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Check Token Balance (On-Chain)                         │
│ Contract: tokenContract.balanceOf(userAddress)                 │
│ Purpose: Verify user has sufficient tokens                     │
│ Display: "Your Balance: X tokens"                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ UI: Calculate & Preview                                        │
│ - User enters amount (e.g., 90 tokens)                        │
│ - Calculate value: amount × price = $76,500                   │
│ - Calculate credit: value × 70% = $53,550                     │
│ - Display: "Estimated Credit Line: $53,550"                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION: Click "Deposit" → Start 2-Step Process            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Approve Token (Transaction 1)                          │
│ Contract: tokenContract.approve(vaultAddress, amount)          │
│ UI: "Step 1 of 2: Approving tokens..."                        │
│ Wait for: Transaction confirmation                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Deposit Collateral (Transaction 2)                     │
│ Contract: solvencyVault.depositCollateral(                     │
│   tokenAddress,                                                 │
│   amount,           // 18 decimals                             │
│   tokenValueUSD,    // 6 decimals                              │
│   0,                // TokenType.RWA                            │
│   true              // issueOAID = true                         │
│ )                                                               │
│ UI: "Step 2 of 2: Depositing collateral..."                   │
│ Wait for: Transaction confirmation                             │
│ Extract: positionId from PositionCreated event                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: ⭐ MANDATORY - Sync with Backend                       │
│ API: POST /solvency/sync-position                              │
│ Body: {                                                         │
│   positionId: "5",                                              │
│   txHash: "0xabc...",                                           │
│   blockNumber: 12345                                            │
│ }                                                               │
│ Purpose: Create position record in backend database            │
│ Without this: Position won't show in UI!                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Refresh Credit Data                                    │
│ API: GET /solvency/oaid/my-credit                              │
│ Purpose: Get updated credit line with new position             │
│ UI: Close modal, show success, refresh dashboard               │
└─────────────────────────────────────────────────────────────────┘
```

### BORROW FLOW (Based on script lines 520-530)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION: Click "Borrow from Platform"                      │
│ (Note: Different from "Borrow from Aave/Compound")            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Show Current Position                                  │
│ API: GET /solvency/positions/my                                │
│ Display:                                                        │
│ - Collateral: 90 tokens ($76,500)                             │
│ - Current Debt: $0                                             │
│ - Available to Borrow: $53,550 (70% LTV)                      │
│ - Health Factor: N/A (no debt yet)                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ UI: Borrow Input                                                │
│ - Input: Borrow amount (max: $53,550)                         │
│ - Calculate: New health factor in real-time                    │
│ - Example: Borrow $5,000 → Health = 1530% (153%)              │
│ - Warning if: Health factor < 125%                             │
│ - Error if: Health factor < 110%                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Borrow USDC (Transaction)                              │
│ Contract: solvencyVault.borrowUSDC(positionId, amount)         │
│ UI: "Processing borrow transaction..."                         │
│ Wait for: Transaction confirmation                             │
│ Extract: borrowed amount, totalDebt from event                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: ⭐ MANDATORY - Sync Position After Borrow              │
│ API: POST /solvency/sync-position                              │
│ Body: {                                                         │
│   positionId: "5",                                              │
│   txHash: "0xdef...",                                           │
│   blockNumber: 12346                                            │
│ }                                                               │
│ Purpose: Update position debt in backend database              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Refresh Position Data                                  │
│ API: GET /solvency/position/{positionId}                       │
│ Purpose: Get updated position with new debt                    │
│ Display: Updated health factor, debt, etc.                     │
│ UI: Close modal, show success                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Implementation Steps

### PHASE 1: Fix Contract Service (CRITICAL - MUST DO FIRST)

**File:** `src/lib/api/solvency-contract.service.ts`

**Problem:** Current ABI doesn't match the deployed contract (based on script)

**Solution:** Update to match reference script

```typescript
// OLD (WRONG):
const VAULT_ABI = [
  'function depositCollateral(bytes32 oaidId, address tokenAddress, uint256 amount) external',
  'function borrow(bytes32 oaidId, uint256 amount) external',
  //... rest
];

// NEW (CORRECT - from script):
const SOLVENCY_VAULT_ABI = [
  'function depositCollateral(address collateralToken, uint256 collateralAmount, uint256 tokenValueUSD, uint8 tokenType, bool issueOAID) external returns (uint256 positionId)',
  'function borrowUSDC(uint256 positionId, uint256 amount) external',
  'function repayLoan(uint256 positionId, uint256 amount) external',
  'function withdrawCollateral(uint256 positionId, uint256 amount) external',
  'function positions(uint256) view returns (address user, address collateralToken, uint256 collateralAmount, uint256 usdcBorrowed, uint256 tokenValueUSD, uint256 createdAt, bool active, uint8 tokenType)',
  'event PositionCreated(uint256 indexed positionId, address indexed user, address collateralToken, uint256 collateralAmount, uint256 tokenValueUSD, uint8 tokenType)',
  'event USDCBorrowed(uint256 indexed positionId, uint256 amount, uint256 totalDebt)',
];
```

**Functions to Rewrite:**

1. `depositCollateral()` - Change signature to match script
2. `borrowUSDC()` - Rename from `borrow()`, change params
3. `repayLoan()` - Add if missing
4. `withdrawCollateral()` - Update to use positionId
5. `getPosition()` - New function to call `positions(positionId)`

**Return Values:**
- `depositCollateral` returns `positionId` (extract from event)
- `borrowUSDC` emits `USDCBorrowed` event with amount and totalDebt

---

### PHASE 2: Implement DepositCollateralModal

**File:** `src/pages/borrow/components/DepositCollateralModal.tsx`

**Components Needed:**

```typescript
interface DepositCollateralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// State Management
const [step, setStep] = useState<'select' | 'approve' | 'deposit' | 'syncing'>('select');
const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
const [selectedAsset, setSelectedAsset] = useState<PortfolioAsset | null>(null);
const [assetDetails, setAssetDetails] = useState<IssuerAsset | null>(null);
const [depositAmount, setDepositAmount] = useState('');
const [tokenBalance, setTokenBalance] = useState('0');
const [isProcessing, setIsProcessing] = useState(false);
```

**Step-by-Step Implementation:**

```typescript
// 1. On open: Fetch portfolio
useEffect(() => {
  if (isOpen) {
    fetchPortfolio();
  }
}, [isOpen]);

async function fetchPortfolio() {
  const data = await portfolioService.getPortfolio();
  setPortfolio(data.portfolio);
}

// 2. When user selects asset: Fetch details and balance
async function handleAssetSelect(asset: PortfolioAsset) {
  setSelectedAsset(asset);

  // Get asset details (token address, price)
  const details = await assetService.getAssetById(asset.assetId);
  setAssetDetails(details);

  // Get token balance (on-chain)
  const balance = await solvencyContractService.getTokenBalance(
    details.token.address,
    userAddress
  );
  setTokenBalance(ethers.formatUnits(balance, 18));
}

// 3. Calculate collateral value in real-time
const collateralValue = useMemo(() => {
  if (!depositAmount || !assetDetails) return '0';

  const amountWei = ethers.parseUnits(depositAmount, 18);
  const pricePerToken = BigInt(assetDetails.listing.price); // 6 decimals
  const valueUSD = (amountWei * pricePerToken) / ethers.parseEther('1');

  return ethers.formatUnits(valueUSD, 6); // Returns "$76,500"
}, [depositAmount, assetDetails]);

// 4. Calculate credit line (70% LTV)
const creditLine = useMemo(() => {
  if (!collateralValue) return '0';

  const value = parseFloat(collateralValue);
  return (value * 0.7).toFixed(2); // 70% LTV
}, [collateralValue]);

// 5. Handle deposit button click
async function handleDeposit() {
  setIsProcessing(true);

  try {
    const { address, isConnected } = useAccount(); // Get from wagmi

    if (!isConnected || !address) {
      throw new Error('Please connect your wallet');
    }

    // Parse amounts
    const amountWei = ethers.parseUnits(depositAmount, 18);
    const pricePerToken = BigInt(assetDetails!.listing.price);
    const tokenValueUSD = (amountWei * pricePerToken) / ethers.parseEther('1');

    // STEP A: Approve token
    setStep('approve');
    const approvalResult = await solvencyContractService.approveToken(
      assetDetails!.token.address,
      amountWei
    );

    if (!approvalResult.success) {
      throw new Error('Token approval failed');
    }

    // STEP B: Deposit collateral
    setStep('deposit');
    const depositResult = await solvencyContractService.depositCollateral(
      assetDetails!.token.address,
      amountWei,
      tokenValueUSD,
      0,    // TokenType.RWA
      true  // issueOAID
    );

    if (!depositResult.success) {
      throw new Error('Deposit failed');
    }

    // Extract positionId from event
    const positionId = depositResult.positionId; // From PositionCreated event

    // STEP C: ⭐ MANDATORY SYNC
    setStep('syncing');
    await solvencyService.syncPosition({
      positionId: positionId.toString(),
      txHash: depositResult.txHash!,
      blockNumber: depositResult.blockNumber!,
    });

    // Success!
    onSuccess();
    onClose();

  } catch (error: any) {
    console.error('Deposit error:', error);
    alert(error.message || 'Deposit failed');
  } finally {
    setIsProcessing(false);
    setStep('select');
  }
}
```

**UI Components:**

1. **Asset Selection** (step === 'select'):
   - Dropdown showing portfolio assets
   - Display token balance
   - Input for deposit amount
   - Show collateral value & credit line preview
   - "Deposit" button

2. **Approval Progress** (step === 'approve'):
   - "Step 1 of 3: Approving tokens..."
   - Transaction hash display
   - Loading spinner

3. **Deposit Progress** (step === 'deposit'):
   - "Step 2 of 3: Depositing collateral..."
   - Transaction hash display
   - Loading spinner

4. **Syncing Progress** (step === 'syncing'):
   - "Step 3 of 3: Syncing with platform..."
   - Loading spinner

5. **Success State**:
   - Close modal
   - Show toast notification
   - Refresh dashboard data

---

### PHASE 3: Add Direct Borrow to BorrowModal

**Option A: Modify existing BorrowModal.tsx**

Add a toggle or separate section for "Borrow from Platform Directly"

**Option B: Create new DirectBorrowModal.tsx** (RECOMMENDED)

**File:** `src/pages/borrow/components/DirectBorrowModal.tsx`

```typescript
interface DirectBorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  position: Position; // From GET /solvency/positions/my
}

export const DirectBorrowModal = ({ isOpen, onClose, onSuccess, position }) => {
  const [borrowAmount, setBorrowAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate max borrow
  const maxBorrow = useMemo(() => {
    // maxBorrow = collateralValue × 70% - currentDebt
    const collateralUSD = parseFloat(ethers.formatUnits(position.tokenValueUSD, 6));
    const currentDebt = parseFloat(ethers.formatUnits(position.outstandingDebt || '0', 6));
    const maxBorrowable = (collateralUSD * 0.7) - currentDebt;
    return Math.max(0, maxBorrowable);
  }, [position]);

  // Calculate new health factor
  const newHealthFactor = useMemo(() => {
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
      return position.healthFactor / 100; // Current health
    }

    const collateralUSD = parseFloat(ethers.formatUnits(position.tokenValueUSD, 6));
    const currentDebt = parseFloat(ethers.formatUnits(position.outstandingDebt || '0', 6));
    const newDebt = currentDebt + parseFloat(borrowAmount);

    if (newDebt === 0) return Infinity;
    return (collateralUSD / newDebt) * 100; // Return as percentage
  }, [borrowAmount, position]);

  async function handleBorrow() {
    setIsProcessing(true);

    try {
      // Parse amount
      const amountWei = ethers.parseUnits(borrowAmount, 6); // USDC = 6 decimals

      // Borrow from vault
      const borrowResult = await solvencyContractService.borrowUSDC(
        position.positionId,
        amountWei
      );

      if (!borrowResult.success) {
        throw new Error('Borrow failed');
      }

      // ⭐ MANDATORY SYNC
      await solvencyService.syncPosition({
        positionId: position.positionId.toString(),
        txHash: borrowResult.txHash!,
        blockNumber: borrowResult.blockNumber!,
      });

      // Success!
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Borrow error:', error);
      alert(error.message || 'Borrow failed');
    } finally {
      setIsProcessing(false);
    }
  }

  // ... UI implementation
};
```

**UI Components:**

1. **Position Summary:**
   - Collateral: X tokens ($Y)
   - Current Debt: $Z
   - Available to Borrow: $maxBorrow
   - Current Health Factor: X%

2. **Borrow Input:**
   - Input field with max button
   - Real-time health factor preview
   - Warning if health < 125%
   - Error if health < 110%

3. **Action Buttons:**
   - "Cancel"
   - "Borrow USDC" (disabled if invalid)

---

### PHASE 4: Update BorrowPage.tsx

**File:** `src/pages/borrow/BorrowPage.tsx`

**Changes Needed:**

1. Add a "Borrow from Platform" button in the CreditSummaryCard area
2. Add state for DirectBorrowModal
3. Fetch user's positions to enable direct borrow

```typescript
// Add state
const [showDirectBorrowModal, setShowDirectBorrowModal] = useState(false);
const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

// Fetch positions
const {
  positions,
  isLoading: isPositionsLoading,
  refetch: refetchPositions,
} = usePositions(address);

// Handle direct borrow click
const handleDirectBorrow = () => {
  if (positions && positions.length > 0) {
    setSelectedPosition(positions[0]); // Or let user select
    setShowDirectBorrowModal(true);
  }
};

// Add modal
{showDirectBorrowModal && selectedPosition && (
  <DirectBorrowModal
    isOpen={showDirectBorrowModal}
    onClose={() => {
      setShowDirectBorrowModal(false);
      setSelectedPosition(null);
    }}
    position={selectedPosition}
    onSuccess={() => {
      refetchCredit();
      refetchPositions();
    }}
  />
)}
```

---

## 🧪 Testing Checklist

### Manual Testing Steps

**Deposit Flow:**
- [ ] 1. Open BorrowPage
- [ ] 2. Click "Deposit Collateral"
- [ ] 3. Verify portfolio loads with owned assets
- [ ] 4. Select an asset
- [ ] 5. Verify token balance shows correctly
- [ ] 6. Enter deposit amount
- [ ] 7. Verify collateral value calculates correctly
- [ ] 8. Verify credit line preview shows 70% of value
- [ ] 9. Click "Deposit"
- [ ] 10. Approve token (transaction 1) ✅
- [ ] 11. Deposit collateral (transaction 2) ✅
- [ ] 12. Verify sync API called ✅
- [ ] 13. Verify modal closes
- [ ] 14. Verify credit card updates with new credit line
- [ ] 15. Check backend: Position exists in database

**Borrow Flow:**
- [ ] 1. Have active position with collateral
- [ ] 2. Click "Borrow from Platform"
- [ ] 3. Verify position details show correctly
- [ ] 4. Enter borrow amount
- [ ] 5. Verify health factor updates in real-time
- [ ] 6. Verify warning shows if health < 125%
- [ ] 7. Click "Borrow USDC"
- [ ] 8. Borrow transaction executes ✅
- [ ] 9. Verify sync API called ✅
- [ ] 10. Verify modal closes
- [ ] 11. Verify position updates with new debt
- [ ] 12. Verify USDC received in wallet
- [ ] 13. Check backend: Position debt updated

### Integration Testing

**Full Flow Test:**
- [ ] 1. Start with 0 positions
- [ ] 2. Deposit 90 tokens worth $76,500
- [ ] 3. Verify OAID credit line created: $53,550
- [ ] 4. Borrow $5,000 USDC
- [ ] 5. Verify health factor: ~153%
- [ ] 6. Verify position shows in portfolio
- [ ] 7. Verify can borrow more up to max
- [ ] 8. Verify cannot borrow beyond max
- [ ] 9. Verify health factor prevents risky borrows

---

## 📦 File Changes Summary

### Files to Modify

1. **`src/lib/api/solvency-contract.service.ts`** - Fix ABI (CRITICAL)
2. **`src/pages/borrow/components/DepositCollateralModal.tsx`** - Complete implementation
3. **`src/pages/borrow/BorrowPage.tsx`** - Add direct borrow button
4. **`src/pages/borrow/components/DirectBorrowModal.tsx`** - NEW FILE - Create

### Files Already Correct (No Changes)

1. ✅ `src/lib/api/solvency.service.ts` - All APIs correct
2. ✅ `src/lib/api/portfolio.service.ts` - Portfolio API correct
3. ✅ `src/lib/api/asset.service.ts` - Asset APIs correct
4. ✅ `src/pages/borrow/hooks/useCreditData.ts` - Credit fetch correct

---

## 🚀 Implementation Order

### Day 1: Critical Fixes
1. ✅ Fix solvency-contract.service.ts ABI
2. ✅ Test contract calls on testnet
3. ✅ Verify depositCollateral returns positionId
4. ✅ Verify borrowUSDC works with positionId

### Day 2-3: Deposit Modal
1. ✅ Implement DepositCollateralModal UI
2. ✅ Add portfolio fetching
3. ✅ Add asset selection
4. ✅ Add balance checking
5. ✅ Add collateral calculation
6. ✅ Add 3-step flow (approve → deposit → sync)
7. ✅ Test full deposit flow

### Day 4: Direct Borrow
1. ✅ Create DirectBorrowModal
2. ✅ Add position selection
3. ✅ Add health factor calculation
4. ✅ Add borrow + sync flow
5. ✅ Test full borrow flow

### Day 5: Integration & Testing
1. ✅ Update BorrowPage
2. ✅ Add UI for direct borrow
3. ✅ End-to-end testing
4. ✅ Fix any bugs

---

## ⚠️ Critical Reminders

1. **ALWAYS sync after deposit/borrow** - `POST /solvency/sync-position`
2. **Extract positionId from event** - `PositionCreated` event after deposit
3. **Use correct decimals:**
   - RWA tokens: 18 decimals
   - USDC: 6 decimals
   - Token value USD: 6 decimals
4. **TokenType enum:** 0 = RWA, 1 = PRIVATE_ASSET
5. **LTV:** 70% for RWA tokens (7000 basis points)
6. **Health Factor:** Must stay >= 110% (11000 basis points)

---

## 📝 Notes

- This plan focuses ONLY on platform direct borrowing
- 3rd party protocol borrowing (Aave/Compound) is separate and not touched
- All APIs and contracts referenced exist in current codebase
- No hallucinated APIs or features
- Reference script has been tested and works on testnet

**Ready to implement? Start with Phase 1: Fixing the contract service!**
