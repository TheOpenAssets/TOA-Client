# Borrow Flow Analysis - Critical Issues Found

## Executive Summary

**STATUS: ❌ INCOMPLETE IMPLEMENTATION**

The borrowing flow is **NOT properly implemented**. There are critical missing components that prevent users from depositing collateral and borrowing USDC.

---

## Expected Flow (From Documentation)

### ✅ Complete Deposit Flow (from deposit-to-vaultsolvency.js)

```
1. Authenticate → Get JWT token
   ├─ GET /auth/challenge?walletAddress={address}&role=INVESTOR
   └─ POST /auth/login (with signature)

2. Fetch Asset Details → Get token address & price
   └─ GET /assets/{assetId}

3. Check Token Balance → On-chain read
   └─ tokenContract.balanceOf(userAddress)

4. Approve Token Spending → On-chain transaction
   └─ tokenContract.approve(vaultAddress, amount)

5. Deposit Collateral → On-chain transaction
   └─ solvencyVaultContract.depositCollateral(
        tokenAddress,
        amount,              // 18 decimals
        tokenValueUSD,       // 6 decimals
        0,                   // TokenType.RWA
        true                 // issueOAID
      )
   └─ Returns: PositionCreated event with positionId

6. 🔴 MANDATORY SYNC → Backend API call
   └─ POST /solvency/sync-position
      {
        positionId: "1",
        txHash: "0x...",
        blockNumber: 12345
      }
   └─ This creates the position in the backend database
   └─ Without this, position won't show in UI!

7. Fetch OAID Credit → Backend API call
   └─ GET /solvency/oaid/my-credit
```

### ✅ Complete Borrow Flow (from deposit-to-vaultsolvency.js)

```
1. Calculate Max Borrow
   └─ maxBorrow = (collateralValueUSD * 7000) / 10000  // 70% LTV

2. Validate Borrow Amount
   └─ borrowAmount <= maxBorrow
   └─ New health factor >= 110%

3. Borrow USDC → On-chain transaction
   └─ solvencyVaultContract.borrowUSDC(positionId, amount)
   └─ Returns: USDCBorrowed event

4. 🔴 MISSING: Sync Position After Borrow
   └─ POST /solvency/sync-position (should be called again)

5. Refresh Position Data
   └─ GET /solvency/position/{positionId}
   └─ GET /solvency/oaid/my-credit
```

---

## Current Implementation Status

### 1. ✅ solvency-contract.service.ts - CORRECT

**Location:** `src/lib/api/solvency-contract.service.ts`

**Status:** ✅ Properly implements all contract calls

**Functions Available:**
- ✅ `depositCollateral(oaidId, tokenAddress, amount)` - Line 327
- ✅ `borrow(oaidId, amount)` - Line 365
- ✅ `approveToken(tokenAddress, amount)` - Line 268
- ✅ `getCollateralBalance()` - Line 122
- ✅ `getDebtBalance()` - Line 137
- ✅ `calculateHealthFactor()` - Line 153
- ✅ `getCreditLimit()` - Line 168

**Note:** Uses OAID-based contract interface (bytes32 oaidId), which is different from the reference script that uses positionId (uint256).

### 2. ✅ solvency.service.ts - CORRECT

**Location:** `src/lib/api/solvency.service.ts`

**Status:** ✅ Properly implements all API calls

**Functions Available:**
- ✅ `getOAIDCredit()` - Line 106 → GET `/solvency/oaid/my-credit`
- ✅ `getMyPositions()` - Line 144 → GET `/solvency/positions/my`
- ✅ `getPosition(positionId)` - Line 182 → GET `/solvency/position/{id}`
- ✅ `syncPosition(request)` - Line 237 → POST `/solvency/sync-position`

**All endpoints match documentation.**

### 3. ❌ DepositCollateralModal.tsx - NOT IMPLEMENTED

**Location:** `src/pages/borrow/components/DepositCollateralModal.tsx`

**Status:** ❌ PLACEHOLDER ONLY - NO IMPLEMENTATION

**Current Code:**
```typescript
export const DepositCollateralModal = ({
  isOpen,
  onClose,
  onSuccess: _onSuccess,  // TODO: Will be used in full implementation
}: DepositCollateralModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[20px] p-8 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-[#111111] mb-4">
          Deposit Collateral
        </h2>
        <p className="text-[#6B7280] mb-6">
          Deposit collateral modal implementation coming next...
        </p>
```

**Missing Implementation:**
1. ❌ No asset/token selection dropdown
2. ❌ No token balance check
3. ❌ No deposit amount input
4. ❌ No collateral value calculation
5. ❌ No credit line preview
6. ❌ No approval flow (Step 1 of 2: Approve)
7. ❌ No deposit flow (Step 2 of 2: Deposit)
8. ❌ No sync call after deposit
9. ❌ No OAID credit refresh

**This means users CANNOT deposit collateral at all!**

### 4. ⚠️ BorrowModal.tsx - WRONG IMPLEMENTATION

**Location:** `src/pages/borrow/components/BorrowModal.tsx`

**Status:** ⚠️ IMPLEMENTS 3RD PARTY PROTOCOL BORROWING, NOT DIRECT VAULT BORROWING

**Current Implementation:**
```typescript
// Line 88-104
const integration = PROTOCOL_INTEGRATIONS[protocol.id as keyof typeof PROTOCOL_INTEGRATIONS];

if (!integration) {
  alert(`${protocol.name} integration coming soon!`);
  onClose();
  return;
}

// Open protocol's borrow interface
if ('openBorrowModal' in integration) {
  await integration.openBorrowModal(creditData.oaidId, borrowAmount);
} else if ('redirectToBorrow' in integration) {
  integration.redirectToBorrow(creditData.oaidId, borrowAmount);
}
```

**What It Does:**
- Opens Aave/Compound/other protocol interfaces
- Uses OAID credit line for borrowing on external protocols
- Does NOT borrow from the vault directly

**What It Should Also Do (Based on Script):**
According to the reference script, users should be able to borrow USDC directly from the vault by calling:
```typescript
await solvencyContractService.borrow(oaidId, borrowAmount);
```

**Issue:** There's no UI for direct vault borrowing. Users can only borrow through 3rd party protocols.

### 5. ❌ Missing: Sync After Borrow

**Problem:** After borrowing (whether from vault or 3rd party), the position must be synced with backend.

**Current:** No sync call after borrow in BorrowModal.tsx

**Should Add:**
```typescript
// After successful borrow
const receipt = await solvencyContractService.borrow(oaidId, amount);

// MANDATORY: Sync with backend
await solvencyService.syncPosition({
  positionId: currentPositionId,
  txHash: receipt.txHash!,
  blockNumber: receipt.blockNumber!,
});

// Refresh data
await onSuccess();
```

---

## Critical Missing Components

### 1. ❌ CRITICAL: Deposit Collateral Flow

**File:** `src/pages/borrow/components/DepositCollateralModal.tsx`

**Status:** NOT IMPLEMENTED (only placeholder)

**Required Implementation:**

```typescript
/**
 * Complete Deposit Collateral Modal Implementation
 * Based on deposit-to-vaultsolvency.js (lines 403-573)
 */

import { useState, useEffect } from 'react';
import { solvencyContractService } from '../../../lib/api/solvency-contract.service';
import { solvencyService } from '../../../lib/api/solvency.service';
import { ethers } from 'ethers';

export const DepositCollateralModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: select, 2: approve, 3: deposit
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [userBalance, setUserBalance] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [oaidId, setOaidId] = useState(''); // Get from user context

  // Step 1: Fetch user's RWA tokens
  useEffect(() => {
    if (isOpen) {
      fetchUserAssets();
    }
  }, [isOpen]);

  async function fetchUserAssets() {
    // TODO: Call API to get user's owned RWA tokens
    // GET /assets/my-tokens or similar
  }

  async function handleSelectAsset(asset) {
    setSelectedAsset(asset);

    // Check token balance
    const balance = await solvencyContractService.getTokenBalance(
      asset.token.address,
      userAddress
    );
    setUserBalance(ethers.formatUnits(balance, 18));
  }

  async function handleDeposit() {
    setIsProcessing(true);

    try {
      // Parse amount
      const amountWei = ethers.parseUnits(depositAmount, 18);

      // Calculate USD value
      const pricePerToken = BigInt(selectedAsset.listing.price); // 6 decimals
      const tokenValueUSD = (amountWei * pricePerToken) / ethers.parseEther('1');

      // Step 1: Approve token
      setStep(2);
      const approvalResult = await solvencyContractService.approveToken(
        selectedAsset.token.address,
        amountWei
      );

      if (!approvalResult.success) {
        throw new Error('Token approval failed');
      }

      // Step 2: Deposit collateral
      setStep(3);
      const depositResult = await solvencyContractService.depositCollateral(
        oaidId,
        selectedAsset.token.address,
        amountWei
      );

      if (!depositResult.success) {
        throw new Error('Deposit failed');
      }

      // Step 3: MANDATORY - Sync with backend
      await solvencyService.syncPosition({
        positionId: oaidId, // or extract from event
        txHash: depositResult.txHash!,
        blockNumber: depositResult.blockNumber!,
      });

      // Success!
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Deposit error:', error);
      alert(error.message);
    } finally {
      setIsProcessing(false);
      setStep(1);
    }
  }

  // ... rest of UI implementation
};
```

### 2. ❌ MISSING: Direct Vault Borrow UI

**Problem:** No UI for borrowing directly from the vault

**Current:** Only 3rd party protocol borrowing implemented

**Need to Add:** A separate modal or option for "Borrow from Vault Directly"

```typescript
// New component needed: DirectBorrowModal.tsx

async function handleDirectBorrow() {
  // 1. Borrow from vault
  const borrowResult = await solvencyContractService.borrow(
    oaidId,
    borrowAmountWei
  );

  // 2. Sync position (IMPORTANT!)
  await solvencyService.syncPosition({
    positionId: currentPositionId,
    txHash: borrowResult.txHash!,
    blockNumber: borrowResult.blockNumber!,
  });

  // 3. Refresh data
  onSuccess();
}
```

### 3. ❌ MISSING: Position Sync After Borrow

**Problem:** BorrowModal doesn't sync position after successful borrow

**Fix Required in:** `src/pages/borrow/components/BorrowModal.tsx`

```typescript
// After line 107 in BorrowModal.tsx
// After successful borrow from protocol, refresh data
onSuccess();

// ADD THIS:
// Sync position with backend after borrow
try {
  await solvencyService.syncPosition({
    positionId: creditData.oaidId, // or actual position ID
    txHash: borrowTxHash,
    blockNumber: borrowBlockNumber,
  });
} catch (error) {
  console.error('Failed to sync position after borrow:', error);
}

onClose();
```

---

## Contract Interface Mismatch

### ⚠️ IMPORTANT: Contract ABI Difference

**Reference Script (deposit-to-vaultsolvency.js):**
```solidity
function depositCollateral(
  address collateralToken,
  uint256 collateralAmount,
  uint256 tokenValueUSD,
  uint8 tokenType,
  bool issueOAID
) external returns (uint256 positionId)
```

**Current Implementation (solvency-contract.service.ts):**
```solidity
function depositCollateral(
  bytes32 oaidId,
  address tokenAddress,
  uint256 amount
) external
```

**Issue:** The contract interfaces don't match!

- ✅ Script uses: `positionId` (uint256) - based on actual contract
- ❌ Current code uses: `oaidId` (bytes32) - different contract?

**This suggests:**
1. Either the contract was changed/updated
2. Or there are two different vault contracts
3. Or the current implementation is using wrong ABI

**Action Required:** Verify which contract ABI is correct and update accordingly.

---

## Step-by-Step Fix Checklist

### Priority 1: Critical (Blocking Users)

- [ ] **1.1** Implement DepositCollateralModal.tsx completely
  - [ ] Add asset/token selection
  - [ ] Add balance check
  - [ ] Add amount input with validation
  - [ ] Add collateral value preview
  - [ ] Add credit limit calculation
  - [ ] Add 2-step flow (Approve → Deposit)
  - [ ] Add sync call after deposit
  - [ ] Add OAID credit refresh

- [ ] **1.2** Verify contract ABI matches deployed contract
  - [ ] Check if vault uses `positionId` or `oaidId`
  - [ ] Update solvency-contract.service.ts if needed
  - [ ] Test deposit on testnet

- [ ] **1.3** Add sync call after borrow in BorrowModal.tsx
  - [ ] Extract transaction hash and block number
  - [ ] Call syncPosition API
  - [ ] Handle sync errors gracefully

### Priority 2: Important (Missing Functionality)

- [ ] **2.1** Create DirectBorrowModal.tsx for vault borrowing
  - [ ] Show max borrow capacity
  - [ ] Real-time health factor calculation
  - [ ] Call vault.borrow() directly
  - [ ] Sync position after borrow

- [ ] **2.2** Add position refresh after all operations
  - [ ] After deposit → refresh positions list
  - [ ] After borrow → refresh debt & health factor
  - [ ] After repay → refresh positions
  - [ ] After withdraw → refresh positions

### Priority 3: Enhancement (UX Improvements)

- [ ] **3.1** Add loading states and progress indicators
  - [ ] Show transaction pending state
  - [ ] Show block confirmation progress
  - [ ] Show sync progress

- [ ] **3.2** Add error handling and user feedback
  - [ ] Handle wallet connection errors
  - [ ] Handle insufficient balance errors
  - [ ] Handle approval errors
  - [ ] Handle sync errors with retry option

- [ ] **3.3** Add transaction history
  - [ ] Show recent deposits
  - [ ] Show recent borrows
  - [ ] Show transaction explorer links

---

## Testing Checklist

After implementing fixes, test:

### Deposit Flow Test
1. [ ] Connect wallet
2. [ ] Select RWA token
3. [ ] Enter deposit amount
4. [ ] Approve token (transaction 1)
5. [ ] Deposit collateral (transaction 2)
6. [ ] Verify position synced to backend
7. [ ] Verify OAID credit line created
8. [ ] Verify position shows in UI

### Borrow Flow Test
1. [ ] Have active position with collateral
2. [ ] Click "Borrow" button
3. [ ] Enter borrow amount
4. [ ] Verify health factor calculation
5. [ ] Execute borrow transaction
6. [ ] Verify position synced to backend
7. [ ] Verify debt updated in UI
8. [ ] Verify USDC received in wallet

### Integration Test
1. [ ] Deposit 100 tokens worth $10,000
2. [ ] Verify max borrow = $7,000 (70% LTV)
3. [ ] Borrow $5,000 USDC
4. [ ] Verify health factor = 200%
5. [ ] Verify position shows correct data in:
   - [ ] Frontend UI
   - [ ] Backend database
   - [ ] On-chain contract

---

## Conclusion

**Current Status: ❌ NOT PRODUCTION READY**

The borrowing system has critical missing components:

1. **DepositCollateralModal is not implemented** - Users cannot deposit collateral
2. **No sync after borrow** - Backend won't be updated after borrowing
3. **Contract ABI mismatch** - Need to verify correct contract interface
4. **No direct vault borrowing UI** - Only 3rd party protocol borrowing available

**Immediate Action Required:**
1. Implement DepositCollateralModal.tsx (Priority 1.1)
2. Verify and fix contract ABI (Priority 1.2)
3. Add sync calls after all transactions (Priority 1.3)

**Estimated Implementation Time:**
- Priority 1 fixes: 2-3 days
- Priority 2 features: 1-2 days
- Priority 3 enhancements: 1-2 days
- Testing: 1-2 days

**Total: ~1 week for complete implementation**
