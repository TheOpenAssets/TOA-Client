# Solvency Vault - Complete Frontend Integration Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Authentication Flow](#authentication-flow)
3. [Investor User Flows](#investor-user-flows)
4. [Admin User Flows](#admin-user-flows)
5. [API Reference & Integration Points](#api-reference--integration-points)
6. [UI States & Display Logic](#ui-states--display-logic)
7. [Error Handling](#error-handling)
8. [Edge Cases & Special Scenarios](#edge-cases--special-scenarios)

---

## System Overview

### What is the Solvency Vault?

The Solvency Vault allows users to:
1. **Deposit collateral** (RWA tokens or Private Assets)
2. **Borrow USDC** against their collateral (up to 70% for RWA, 60% for Private Assets)
3. **Receive OAID credit lines** automatically for use on partner protocols (Aave, Compound, etc.)
4. **Repay loans** and **withdraw collateral**
5. **Monitor health factors** to avoid liquidation

### Key Concepts for Frontend

- **LTV (Loan-to-Value)**: 70% for RWA tokens, 60% for private assets
- **Health Factor**: (Collateral Value / Debt) × 100%. Must stay > 110% to avoid liquidation
- **OAID Credit Line**: Automatically created when user deposits collateral
- **Interest Rate**: 5% APR on borrowed USDC
- **Liquidation Threshold**: Health factor < 110%

---

## Authentication Flow

### Step 1: Initial Authentication

**UI Components:**
- Wallet connection button (MetaMask/WalletConnect)
- Role selection (INVESTOR or ADMIN)

**Backend Integration:**

Call function: `getJWTToken()` (from `deposit-to-solvency-vault.js` lines 123-169)

```javascript
// Step 1a: Request challenge
GET /auth/challenge?walletAddress={address}&role=INVESTOR

Response:
{
  "nonce": "abc123...",
  "message": "Sign this message to authenticate with Open Assets Platform.\n\nNonce: abc123..."
}
```

```javascript
// Step 1b: Sign the message
const signature = await wallet.signMessage(challengeData.message);
```

```javascript
// Step 1c: Submit login
POST /auth/login
Headers: { "Content-Type": "application/json" }
Body: {
  "walletAddress": "0x...",
  "message": "Sign this message to authenticate...",
  "signature": "0x..."
}

Response:
{
  "tokens": {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "..."
  },
  "user": {
    "walletAddress": "0x...",
    "role": "INVESTOR",
    "id": "..."
  }
}
```

**UI Display:**
- Show loading spinner during authentication
- On success: "Authenticated successfully as INVESTOR"
- Store JWT token in localStorage/sessionStorage
- Redirect to main dashboard

---

## Investor User Flows

### Flow 1: Main Dashboard / Landing Page

**Page:** Borrow Dashboard

**UI Components:**
1. **Credit Line Summary Card**
   - Total Credit Limit
   - Credit Used
   - Available Credit
   - Utilization Rate

2. **Protocol Cards** (Aave, Compound, etc.)
   - Protocol logo
   - "Borrow" button for each protocol
   - APY rate display

3. **My Positions Table**(in portfolio only not in borrow)
   - Position ID
   - Collateral Type
   - Collateral Amount
   - Borrowed Amount
   - Health Factor (with color coding)
   - Actions (Borrow More, Repay, Withdraw)

**Backend Integration:**

```javascript
// Fetch user's credit summary
GET /solvency/oaid/my-credit
Headers: { "Authorization": "Bearer {jwt}" }

Response:
{
  "totalCreditLimit": "35000000000",      // $35,000 (6 decimals)
  "totalCreditUsed": "20000000000",       // $20,000 (6 decimals)
  "totalAvailableCredit": "15000000000",  // $15,000 (6 decimals)
  "summary": {
    "utilizationRate": "57.14%",
    "activeCreditLines": 2,
    "totalCreditLines": 2
  },
  "creditLines": [
    {
      "creditLineId": 1,
      "solvencyPositionId": 3,
      "creditLimit": "35000000000",
      "creditUsed": "20000000000",
      "active": true,
      "collateralToken": "0x...",
      "collateralAmount": "50000000000000000000"
    }
  ]
}
```

**Function Reference:** `fetchOAIDCredit()` from script (lines 361-401)

```javascript
// Fetch all user positions
GET /solvency/positions/my?status=ACTIVE&limit=20&offset=0
Headers: { "Authorization": "Bearer {jwt}" }

Response:
{
  "positions": [
    {
      "positionId": 1,
      "collateralToken": {
        "address": "0x742d35Cc...",
        "symbol": "INVOICE-001",
        "name": "Invoice Token",
        "type": "RWA"
      },
      "collateralAmount": "90000000000000000000",  // 90 tokens
      "tokenValueUSD": "76500000000",              // $76,500
      "usdcBorrowed": "50000000000",               // $50,000
      "outstandingDebt": "50041100000",            // $50,041.10 (with interest)
      "healthFactor": 15300,                       // 153%
      "healthStatus": "HEALTHY",
      "status": "ACTIVE",
      "maxBorrowCapacity": "53550000000",          // $53,550 (70% LTV)
      "createdAt": "2026-01-03T10:30:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

**UI Display Logic:**

```javascript
// Display credit summary
const creditLimit = formatUSDC(data.totalCreditLimit);     // "$35,000.00"
const creditUsed = formatUSDC(data.totalCreditUsed);       // "$20,000.00"
const creditAvailable = formatUSDC(data.totalAvailableCredit); // "$15,000.00"
const utilizationRate = data.summary.utilizationRate;       // "57.14%"

// Health Factor Color Coding
function getHealthFactorColor(healthFactor) {
  if (healthFactor >= 15000) return "green";      // Healthy (>150%)
  if (healthFactor >= 12500) return "yellow";     // Warning (125-150%)
  if (healthFactor >= 11000) return "orange";     // Danger (110-125%)
  return "red";                                    // Liquidatable (<110%)
}

// Health Factor Display
const healthPercent = (position.healthFactor / 100).toFixed(2) + "%"; // "153.00%"
```

---

### Flow 2: Borrow from Partner Protocol (User Has Sufficient Collateral)

**Scenario:** User has deposited collateral and has available credit

**Step 2.1: Click "Borrow" on Protocol Card**

**UI Action:**
- User clicks "Borrow" button on Aave/Compound card
- Modal opens: "Borrow from Aave"

**Step 2.2: Borrow Amount Modal**

**UI Components:**
- Input field: "Amount to Borrow (USDC)"
- Display: "Available Credit: $15,000.00"
- Display: "Current Health Factor: 153%"
- Display: "New Health Factor (after borrow): [calculated dynamically]"
- Warning banner (if health factor < 125%): "⚠️ Your health factor is approaching liquidation threshold"
- Button: "Confirm Borrow"

**Real-time Health Factor Calculation:**

```javascript
// As user types the borrow amount, calculate new health factor
function calculateNewHealthFactor(currentCollateralValue, currentDebt, additionalBorrow) {
  const newDebt = currentDebt + additionalBorrow;
  const newHealthFactor = (currentCollateralValue / newDebt) * 10000;
  return newHealthFactor;
}

// Example:
// Current: $76,500 collateral, $50,000 debt = 153% health
// Borrow additional $5,000
// New: $76,500 / $55,000 = 139% health
```

**Validation:**

```javascript
// Check if user has enough available credit
if (borrowAmount > availableCredit) {
  showError("Insufficient credit available. You can borrow up to $" + availableCredit);
  return;
}

// Check if new health factor is safe
const newHealthFactor = calculateNewHealthFactor(collateralValue, currentDebt, borrowAmount);
if (newHealthFactor < 11000) {
  showError("This borrow would put your position at risk of liquidation. Maximum safe borrow: $" + maxSafeBorrow);
  return;
}
```

**Step 2.3: Execute Borrow Transaction**

**Backend Integration:**

Call function: `borrowUSDC()` from script (lines 258-302)

```javascript
// On-chain transaction (user signs with wallet)
// Call SolvencyVault.borrowUSDC(positionId, amount)

const tx = await solvencyVaultContract.borrowUSDC(
  positionId,      // e.g., 1
  borrowAmountWei  // e.g., 5000000000 (5000 USDC, 6 decimals)
);

await tx.wait(); // Wait for confirmation

// Transaction emits USDCBorrowed event
Event: USDCBorrowed(positionId, amount, totalDebt)
```

**UI Display During Transaction:**
1. Show loading modal: "Processing transaction..."
2. Show transaction hash: "Tx: 0xabc123..."
3. Show progress: "Waiting for confirmation (this may take up to 5 minutes)..."
4. On success: "✅ Borrowed $5,000 USDC successfully!"
5. Show explorer link: "View on Explorer"

**Step 2.4: Refresh Position Data**

```javascript
// After successful borrow, refresh position details
GET /solvency/position/{positionId}
Headers: { "Authorization": "Bearer {jwt}" }

Response:
{
  "positionId": 1,
  "collateralAmount": "90000000000000000000",
  "tokenValueUSD": "76500000000",
  "usdcBorrowed": "55000000000",        // Updated
  "outstandingDebt": "55000000000",     // Updated
  "healthFactor": 13909,                // Updated (139.09%)
  "healthStatus": "HEALTHY",
  "maxBorrowCapacity": "53550000000",
  "remainingBorrowCapacity": "-1450000000", // Negative! (over-borrowed slightly due to rounding)
  "createdAt": "2026-01-03T10:30:00Z"
}
```

**UI Update:**
- Update dashboard with new borrowed amount
- Update health factor with new color
- Show notification: "Your position has been updated"
- Refresh OAID credit line display

---

### Flow 3: Borrow from Partner Protocol (User Needs More Collateral)

**Scenario:** User tries to borrow but has insufficient collateral

**Step 3.1: User Enters Borrow Amount**

**UI Action:**
- User types amount in borrow modal
- Real-time validation shows: "❌ Insufficient credit. Available: $0.00"

**Step 3.2: Insufficient Collateral Message**

**UI Display:**

```
⚠️ Insufficient Collateral

You need more collateral to borrow $10,000 USDC.
Your current credit limit: $0.00

Options:
1. [Buy More RWA Tokens] → Redirect to marketplace
2. [Upload Off-Chain Asset] → Submit private asset for approval
```

**UI Components:**
- Two large buttons:
  - "Buy RWA Tokens" (redirect to `/marketplace`)
  - "Upload Private Asset" (open private asset submission form)

---

### Flow 4: Upload Off-Chain Asset (Private Asset Submission)

**Step 4.1: Private Asset Upload Form**

**Page:** Private Asset Submission

**UI Components:**

1. **Asset Information**
   - Asset Name (text input)
   - Asset Type (dropdown): DEED, BOND, INVOICE, EQUIPMENT, OTHER
   - Location (text input)
   - Your Valuation Estimate (USD amount input)
   - Description (textarea)

2. **Document Upload**
   - Document Type (dropdown): Property Deed, Corporate Bond, Invoice, Equipment Title, Other
   - File Upload (drag & drop or browse)
   - Supported formats: PDF, JPG, PNG
   - Max size: 10MB

3. **Submit Button**
   - "Submit for Admin Review"

**Backend Integration:**

```javascript
// Step 1: Upload document to IPFS (or your storage)
// You may have a separate endpoint for this, or handle it client-side

// Step 2: Submit private asset request
POST /solvency/private-asset/upload-request
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer {jwt}"
}
Body: {
  "name": "123 Main St Property Deed",
  "assetType": "DEED",
  "location": "California, USA",
  "claimedValuation": "500000000000",  // User's estimate: $500,000 (6 decimals)
  "documentHash": "QmX4H8Yp9kqZ...",   // IPFS hash after upload
  "documentUrl": "https://ipfs.io/ipfs/QmX4H8Yp9kqZ...",
  "description": "Single-family home, 3 bed 2 bath, recent appraisal included",
  "metadata": {
    "fileSize": 2048576,
    "fileType": "application/pdf",
    "additionalNotes": "Certified appraisal attached"
  }
}

Response:
{
  "success": true,
  "message": "Private asset request submitted for admin review",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "request": {
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "123 Main St Property Deed",
    "assetType": "DEED",
    "claimedValuation": "500000000000",
    "status": "PENDING",
    "createdAt": "2026-01-04T10:00:00Z"
  }
}
```

**UI Display After Submission:**

```
✅ Asset Submitted Successfully

Your private asset has been submitted for admin review.

Request ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Asset Name: 123 Main St Property Deed
Your Valuation: $500,000
Status: ⏳ Pending Admin Review

We'll notify you once the admin has reviewed your asset.
Typical review time: 1-3 business days.

[View My Requests]  [Back to Dashboard]
```

**Step 4.2: Waiting for Admin Approval**

**Page:** My Private Asset Requests

**Backend Integration:**

```javascript
// Fetch user's private asset requests
GET /solvency/private-asset/my-requests
Headers: { "Authorization": "Bearer {jwt}" }

Response:
{
  "success": true,
  "count": 2,
  "requests": [
    {
      "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "123 Main St Property Deed",
      "assetType": "DEED",
      "claimedValuation": "500000000000",    // User's estimate
      "status": "PENDING",
      "createdAt": "2026-01-04T10:00:00Z"
    },
    {
      "requestId": "b2c3d4e5-f6g7-8901-bcde-fg2345678901",
      "name": "Corporate Bond Series A",
      "assetType": "BOND",
      "claimedValuation": "1000000000000",
      "status": "APPROVED",
      "finalValuation": "950000000000",      // Admin's decision ($950k instead of $1M)
      "tokenAddress": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      "tokenSymbol": "BOND-001",
      "solvencyPositionId": 5,
      "reviewedAt": "2026-01-04T12:00:00Z",
      "createdAt": "2026-01-03T11:00:00Z"
    }
  ]
}
```

**UI Display:**

```
My Private Asset Requests

┌─────────────────────────────────────────────────────────────┐
│ Request #1: 123 Main St Property Deed                       │
│ Status: ⏳ PENDING                                           │
│ Your Valuation: $500,000                                    │
│ Submitted: Jan 4, 2026 10:00 AM                            │
│ [View Details]                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Request #2: Corporate Bond Series A                         │
│ Status: ✅ APPROVED                                          │
│ Your Valuation: $1,000,000                                  │
│ Final Valuation: $950,000 (by Admin)                       │
│ Token: BOND-001 (0x9fE4...fa6e0)                           │
│ Credit Line: $570,000 (60% LTV)                            │
│ Position ID: #5                                             │
│ Approved: Jan 4, 2026 12:00 PM                             │
│ [View Position] [Borrow Now]                               │
└─────────────────────────────────────────────────────────────┘
```

**Status Badges:**
- PENDING: Yellow badge with clock icon
- APPROVED: Green badge with checkmark
- REJECTED: Red badge with X icon

**Step 4.3: Admin Approves Asset**

**Notification to User:**

When admin approves the asset, the backend automatically:
1. Mints the private asset token (1 whole token, non-fractionalized)
2. Deposits it to SolvencyVault on user's behalf
3. Creates OAID credit line with 60% LTV
4. Sends notification to user

**UI Notification (Real-time via SSE or polling):**

```
🎉 Your Private Asset Has Been Approved!

Asset: 123 Main St Property Deed
Your Valuation: $500,000
Final Valuation: $450,000 (by Admin)
Note: Admin adjusted valuation based on market appraisal

✅ Token Minted: DEED-001 (0x9fE4...fa6e0)
✅ Deposited to Vault: Position #5
✅ Credit Line Created: $270,000 (60% LTV)

You can now borrow up to $270,000 USDC using this collateral!

[View Position] [Borrow Now]
```

**Backend Integration (Admin Side - covered in Admin Flow section):**

```javascript
// Admin approves the request
POST /admin/solvency/private-asset/approve/{requestId}
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer {adminJwt}"
}
Body: {
  "finalValuation": "450000000000",  // Admin's decision: $450k (not $500k)
  "notes": "Approved based on recent appraisal, reduced from claimed $500k to $450k market value"
}

Response:
{
  "success": true,
  "message": "Private asset request approved and token minted",
  "tokenAddress": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  "tokenSymbol": "DEED-001",
  "mintTxHash": "0xmno345...",
  "finalValuation": "450000000000",
  "depositTxHash": "0xpqr678...",
  "solvencyPositionId": 5,
  "oaidCreditLimit": "270000000000"  // 60% LTV = $270k
}
```

**Important:** The token is automatically deposited to the vault - user does NOT need to deposit manually!

---

### Flow 5: Deposit RWA Tokens (Buy from Marketplace Flow)

**Scenario:** User buys RWA tokens from marketplace and wants to deposit as collateral

**Step 5.1: User Buys RWA Tokens**

**UI Journey:**
1. User goes to Marketplace (`/marketplace`)
2. Purchases RWA tokens (e.g., 90 INVOICE tokens)

**Step 5.2: borrow page**

**Page:** Deposit Collateral

**UI Components:**

1. **Token Selection**
   - Dropdown: "Select Token to Deposit"
   - Options: Show all RWA tokens user owns
   - Display: Token symbol, balance, current price

2. **Deposit Amount**
   - Input: "Amount to Deposit"
   - Display: "Your Balance: 90 INVOICE-001"
   - Display: "Token Price: $0.85 per token"
   - Display: "Collateral Value: $76.50" (calculated in real-time)

3. **Credit Line Preview**
   - Display: "Estimated Credit Line: $53.55 (70% LTV)"
   - Display: "You'll be able to borrow up to $53.55 USDC"

4. **OAID Option**
   - Checkbox: "Create OAID Credit Line for Partner Protocols" (checked by default)
   - Info tooltip: "OAID allows you to use this collateral on Aave, Compound, and other partner platforms"

5. **Submit Button**
   - "Deposit Collateral"

**Backend Integration - Step by Step:**

**Function Reference:** Follow `main()` function from script (lines 403-573)

**Step 5.2a: Fetch Asset Details**

```javascript
// Get asset details (token address, price)
GET /assets/{assetId}
Headers: { "Authorization": "Bearer {jwt}" }

Response:
{
  "id": "4c81f5c6-da7b-46b0-8026-0bf859950135",
  "name": "Invoice Token",
  "token": {
    "address": "0xC91f80c110fE53c0549D990D0eE5bE8EAF123D5e",
    "symbol": "INVOICE-001",
    "decimals": 18
  },
  "listing": {
    "price": "850000",  // $0.85 per token (6 decimals)
    "totalSupply": "1000000000000000000000"
  }
}
```

**Function Reference:** Lines 428-461 in script

**Step 5.2b: Check Token Balance (On-Chain)**

```javascript
// Call ERC20.balanceOf(userAddress) on-chain
const balance = await tokenContract.balanceOf(walletAddress);
// Returns: 90000000000000000000 (90 tokens, 18 decimals)

// Also get decimals and symbol
const decimals = await tokenContract.decimals(); // 18
const symbol = await tokenContract.symbol();     // "INVOICE-001"
```

**Function Reference:** `checkTokenBalance()` function (lines 171-180)

**UI Display:**
- "Your Balance: 90.00 INVOICE-001"
- Enable deposit input field

**Step 5.2c: Calculate Collateral Value**

```javascript
// User enters deposit amount: 90 tokens
const depositAmount = 90; // tokens
const pricePerToken = 850000; // $0.85 (6 decimals)

// Calculate total value
const depositAmountWei = ethers.parseUnits("90", 18);
const tokenValueUSD = (depositAmountWei * BigInt(pricePerToken)) / ethers.parseEther("1");
// tokenValueUSD = 76500000000 ($76,500 with 6 decimals)

// Calculate max borrow (70% LTV for RWA)
const RWA_LTV = 7000; // 70%
const maxBorrowWei = (tokenValueUSD * BigInt(RWA_LTV)) / BigInt(10000);
// maxBorrowWei = 53550000000 ($53,550)
```

**Function Reference:** Lines 490-497 in script

**UI Display:**
- "Collateral Value: $76,500.00"
- "Estimated Credit Line: $53,550.00 (70% LTV)"

**Step 5.2d: Approve Token Spending (On-Chain)**

```javascript
// User clicks "Deposit Collateral"
// First, check if approval is needed
const currentAllowance = await tokenContract.allowance(
  walletAddress,
  solvencyVaultAddress
);

if (currentAllowance < depositAmountWei) {
  // Need to approve
  const tx = await tokenContract.approve(
    solvencyVaultAddress,
    depositAmountWei
  );

  // Wait for confirmation
  await tx.wait();
}
```

**Function Reference:** `approveToken()` function (lines 182-199)

**UI Display:**
1. Show modal: "Step 1 of 2: Approve Token"
2. "Please sign the approval transaction in your wallet..."
3. Show transaction hash
4. "✅ Tokens approved. Proceeding to deposit..."

**Step 5.2e: Deposit Collateral (On-Chain Transaction)**

```javascript
// Call SolvencyVault.depositCollateral()
const tx = await solvencyVaultContract.depositCollateral(
  tokenAddress,       // RWA token address
  depositAmountWei,   // 90 tokens (18 decimals)
  tokenValueUSD,      // $76,500 (6 decimals)
  0,                  // TokenType: 0 = RWA, 1 = PRIVATE_ASSET
  true                // issueOAID: true to create credit line
);

// Wait for confirmation
const receipt = await tx.wait();

// Parse PositionCreated event
const positionCreatedEvent = receipt.logs.find(log =>
  log.topics[0] === ethers.id("PositionCreated(uint256,address,address,uint256,uint256,uint8)")
);
const positionId = ethers.decodeLog(positionCreatedEvent).positionId;
```

**Function Reference:** `depositCollateral()` function (lines 201-256)

**UI Display:**
1. Show modal: "Step 2 of 2: Deposit Collateral"
2. "Please confirm the deposit transaction in your wallet..."
3. "Transaction submitted: 0xabc123..."
4. "Waiting for confirmation (this may take up to 5 minutes)..."
5. "✅ Deposit confirmed!"
6. "Position ID: #5"
7. "View on Explorer: [link]"

**Step 5.2f: Sync Position with Backend (MANDATORY)**

```javascript
// After on-chain deposit, sync with backend database
POST /solvency/sync-position
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer {jwt}"
}
Body: {
  "positionId": "5",
  "txHash": "0xabc123...",
  "blockNumber": 12345678
}

Response:
{
  "success": true,
  "message": "Position synced successfully",
  "position": {
    "id": "mongo_doc_id",
    "positionId": 5,
    "userAddress": "0x...",
    "collateralTokenAddress": "0xC91f80c110fE53c0549D990D0eE5bE8EAF123D5e",
    "collateralAmount": "90000000000000000000",
    "tokenValueUSD": "76500000000",
    "maxBorrowCapacity": "53550000000",
    "status": "ACTIVE",
    "oaidCreditLineId": 1
  }
}
```

**Function Reference:** `syncPositionWithBackend()` function (lines 324-359)

**Important:** This step is MANDATORY. Without it, the position exists on-chain but not in the backend database, and the user won't be able to see it in the UI or receive notifications.

**UI Display:**
- "✅ Position synced with backend"
- "Your position is now active!"

**Step 5.2g: Fetch OAID Credit Details**

```javascript
// Fetch OAID credit line details
GET /solvency/oaid/my-credit
Headers: { "Authorization": "Bearer {jwt}" }

Response:
{
  "totalCreditLimit": "53550000000",     // $53,550
  "totalCreditUsed": "0",                // $0 (nothing borrowed yet)
  "totalAvailableCredit": "53550000000", // $53,550
  "summary": {
    "utilizationRate": "0.00%",
    "activeCreditLines": 1,
    "totalCreditLines": 1
  },
  "creditLines": [
    {
      "creditLineId": 1,
      "solvencyPositionId": 5,
      "creditLimit": "53550000000",
      "creditUsed": "0",
      "active": true,
      "collateralToken": "0xC91f80c110fE53c0549D990D0eE5bE8EAF123D5e",
      "collateralAmount": "90000000000000000000"
    }
  ]
}
```

**Function Reference:** `fetchOAIDCredit()` function (lines 361-401)

**Step 5.3: Success Page**

**UI Display:**

```
🎉 Collateral Deposited Successfully!

Position ID: #5
Collateral: 90.00 INVOICE-001
Collateral Value: $76,500.00
Credit Line: $53,550.00 (70% LTV)
Health Factor: N/A (no debt yet)

✅ OAID Credit Line Created
You can now borrow on Aave, Compound, and other partner protocols!

Next Steps:
• [Borrow USDC] → Borrow against this collateral
• [View Position] → See position details
• [Back to Dashboard] → Return to main page

⚠️ Important: Maintain health factor above 110% to avoid liquidation!
```

**Optional: Borrow Immediately After Deposit**

**UI Component:**
- Checkbox during deposit: "Borrow USDC after deposit"
- If checked, show input: "Borrow Amount (max $53,550)"
- After deposit, automatically proceed to borrow transaction

**Function Reference:** Lines 520-533 in script

---

### Flow 6: Repayment Process

**Page:** Repay Loan

**UI Components:**

1. **Position Selection**
   - Dropdown: "Select Position to Repay"
   - Show positions with outstanding debt

2. **Repayment Amount**
   - Display: "Outstanding Debt: $50,041.10" (principal + interest)
   - Display: "Principal: $50,000.00"
   - Display: "Interest Accrued: $41.10"
   - Input: "Repayment Amount"
   - Quick buttons: "25%", "50%", "75%", "100%"
   - Display: "New Debt After Repayment: $25,020.55"
   - Display: "New Health Factor: 306%"

3. **USDC Balance Check**
   - Display: "Your USDC Balance: $60,000.00"
   - Warning if insufficient: "❌ Insufficient USDC balance"

4. **Submit Button**
   - "Repay Loan"

**Backend Integration:**

**Step 6.1: Fetch Position Details**

```javascript
GET /solvency/position/{positionId}
Headers: { "Authorization": "Bearer {jwt}" }

Response:
{
  "positionId": 5,
  "collateralAmount": "90000000000000000000",
  "tokenValueUSD": "76500000000",
  "usdcBorrowed": "50000000000",        // Principal
  "outstandingDebt": "50041100000",     // Principal + interest
  "interestAccrued": "41100000",        // $41.10
  "healthFactor": 15297,                // 152.97%
  "status": "ACTIVE"
}
```

**Step 6.2: Check USDC Balance (On-Chain)**

```javascript
const usdcBalance = await usdcContract.balanceOf(walletAddress);
// Returns: 60000000000 ($60,000 with 6 decimals)
```

**Step 6.3: Approve USDC Spending (On-Chain)**

```javascript
// User enters repayment amount: $25,000
const repaymentAmount = ethers.parseUnits("25000", 6); // 6 decimals for USDC

// Check allowance
const currentAllowance = await usdcContract.allowance(
  walletAddress,
  solvencyVaultAddress
);

if (currentAllowance < repaymentAmount) {
  // Approve
  const tx = await usdcContract.approve(
    solvencyVaultAddress,
    repaymentAmount
  );
  await tx.wait();
}
```

**UI Display:**
- "Step 1 of 2: Approve USDC"
- "Please sign the approval transaction..."
- "✅ USDC approved"

**Step 6.4: Execute Repayment (On-Chain Transaction)**

```javascript
// Call SolvencyVault.repayLoan()
const tx = await solvencyVaultContract.repayLoan(
  positionId,        // e.g., 5
  repaymentAmount    // 25000000000 ($25,000 USDC)
);

const receipt = await tx.wait();
```

**UI Display:**
- "Step 2 of 2: Repay Loan"
- "Processing repayment..."
- "Transaction: 0xdef456..."
- "✅ Repayment successful!"

**Step 6.5: Fetch Updated Position**

```javascript
GET /solvency/position/{positionId}
Headers: { "Authorization": "Bearer {jwt}" }

Response:
{
  "positionId": 5,
  "outstandingDebt": "25020550000",     // Updated: $25,020.55
  "healthFactor": 30588,                // Updated: 305.88%
  "healthStatus": "HEALTHY",
  "totalRepaid": "25000000000",
  "lastRepaymentTime": "2026-01-05T14:30:00Z"
}
```

**Step 6.6: Success Page**

```
✅ Loan Repayment Successful!

Repaid: $25,000.00
Remaining Debt: $25,020.55
Health Factor: 305.88% (Healthy ✅)

Your position is now safer!

[View Position] [Repay More] [Back to Dashboard]
```

**Special Case: Full Repayment**

If user repays 100% of debt:

```javascript
Response:
{
  "positionId": 5,
  "outstandingDebt": "0",
  "healthFactor": 0,               // No debt = no health factor
  "healthStatus": "HEALTHY",
  "fullyRepaid": true,
  "lastRepaymentTime": "2026-01-05T14:30:00Z"
}
```

**UI Display:**

```
🎉 Loan Fully Repaid!

You have successfully repaid your entire loan of $50,041.10.

Outstanding Debt: $0.00
Health Factor: N/A (no debt)

You can now:
• [Withdraw Collateral] → Get your tokens back
• [Borrow Again] → Borrow more USDC (up to $53,550)
• [Back to Dashboard]

Note: Withdrawing collateral will reduce your OAID credit line.
```

---

### Flow 7: Withdraw Collateral

**Page:** Withdraw Collateral

**Requirements:**
- Debt must be fully repaid (outstandingDebt = 0)

**UI Components:**

1. **Position Selection**
   - Dropdown: "Select Position to Withdraw From"
   - Show only positions with zero debt

2. **Withdrawal Amount**
   - Display: "Available to Withdraw: 90.00 INVOICE-001"
   - Display: "Collateral Value: $76,500.00"
   - Input: "Withdrawal Amount"
   - Quick buttons: "25%", "50%", "75%", "100%"

3. **OAID Impact Warning**
   - Warning banner: "⚠️ Withdrawing collateral will reduce your OAID credit line"
   - Display: "Current Credit Limit: $53,550.00"
   - Display: "New Credit Limit: $40,162.50" (if withdrawing 25%)

4. **Submit Button**
   - "Withdraw Collateral"

**Backend Integration:**

**Step 7.1: Validate Debt is Zero**

```javascript
GET /solvency/position/{positionId}

Response:
{
  "positionId": 5,
  "outstandingDebt": "0",          // Must be zero
  "collateralAmount": "90000000000000000000",
  "status": "ACTIVE"
}
```

**UI Validation:**
```javascript
if (position.outstandingDebt > 0) {
  showError("Cannot withdraw. You have outstanding debt of $" + formatUSDC(position.outstandingDebt));
  showMessage("Please repay your loan first.");
  return;
}
```

**Step 7.2: Execute Withdrawal (On-Chain Transaction)**

```javascript
// User wants to withdraw 22.5 tokens (25%)
const withdrawalAmount = ethers.parseUnits("22.5", 18);

// Call SolvencyVault.withdrawCollateral()
const tx = await solvencyVaultContract.withdrawCollateral(
  positionId,          // e.g., 5
  withdrawalAmount     // 22500000000000000000
);

const receipt = await tx.wait();
```

**UI Display:**
- "Processing withdrawal..."
- "Transaction: 0xghi789..."
- "✅ Withdrawal successful!"

**Step 7.3: Fetch Updated Position and OAID Credit**

```javascript
// Position updated
GET /solvency/position/{positionId}

Response:
{
  "positionId": 5,
  "collateralAmount": "67500000000000000000",  // 67.5 tokens (reduced)
  "tokenValueUSD": "57375000000",              // $57,375 (reduced)
  "outstandingDebt": "0",
  "maxBorrowCapacity": "40162500000",          // $40,162.50 (70% of $57,375)
  "status": "ACTIVE"
}

// OAID credit line updated
GET /solvency/oaid/my-credit

Response:
{
  "totalCreditLimit": "40162500000",     // Reduced!
  "totalCreditUsed": "0",
  "totalAvailableCredit": "40162500000"
}
```

**Step 7.4: Success Page**

```
✅ Collateral Withdrawn Successfully!

Withdrawn: 22.50 INVOICE-001 ($19,125.00)
Remaining Collateral: 67.50 INVOICE-001 ($57,375.00)

⚠️ Your OAID credit line has been updated:
• Previous Credit Limit: $53,550.00
• New Credit Limit: $40,162.50
• Reduction: $13,387.50

[View Position] [Withdraw More] [Back to Dashboard]
```

**Special Case: Full Withdrawal (Close Position)**

If user withdraws 100% of collateral:

```javascript
Response:
{
  "positionId": 5,
  "collateralAmount": "0",
  "tokenValueUSD": "0",
  "status": "CLOSED",              // Position closed!
  "positionClosed": true
}
```

**UI Display:**

```
🎉 Position Closed!

You have withdrawn all your collateral.
Position #5 is now closed.

Withdrawn: 90.00 INVOICE-001 ($76,500.00)
OAID Credit Line: Deactivated

Your tokens have been returned to your wallet.

[View Closed Positions] [Create New Position] [Back to Dashboard]
```

---

### Flow 8: Maturity Mismatch Handling

**Scenario:** User's collateral (RWA token) has a maturity date that is LATER than the loan repayment period.

**Example:**
- User deposits RWA tokens that mature in **12 months**
- User wants to borrow for **6 months**
- When the loan is due (6 months), the collateral is still locked (matures in 12 months)

**Step 8.1: Detect Maturity Mismatch**

During borrow flow, check maturity dates:

```javascript
// Fetch asset maturity date
GET /assets/{assetId}

Response:
{
  "maturityDate": "2026-12-31T00:00:00Z",  // 12 months from now
  // ... other asset data
}

// Calculate loan repayment date
const loanPeriod = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in ms
const repaymentDate = Date.now() + loanPeriod;   // 6 months from now

// Check mismatch
if (new Date(asset.maturityDate) > new Date(repaymentDate)) {
  // Maturity mismatch detected!
  showMaturityMismatchModal();
}
```

**Step 8.2: Maturity Mismatch Modal**

**UI Display:**

```
⚠️ Collateral Maturity Mismatch Detected

Your collateral (INVOICE-001) matures on: Dec 31, 2026
Your loan repayment is due on: Jun 30, 2026

Because your collateral matures AFTER your loan is due, you have two options:

Option 1: Auto-Repay from Maturity Yield ✅ Recommended
When your collateral matures, the platform will automatically use the maturity proceeds to repay your outstanding loan. Any excess will be returned to you.

Option 2: Manual Repayment
You'll need to repay the loan manually before Jun 30, 2026. If you don't repay by the due date, your borrowed USDC will go into "default mode" and the platform will automatically repay from maturity proceeds.

[✓] Enable Auto-Repay from Yield (Recommended)
[ ] I'll Repay Manually (I understand the risk)

[Understood, Proceed] [Cancel]
```

**Step 8.3: User Selection**

**Backend Integration:**

```javascript
// If user selects "Auto-Repay from Yield"
POST /solvency/position/{positionId}/set-auto-repay
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer {jwt}"
}
Body: {
  "autoRepayEnabled": true
}

Response:
{
  "success": true,
  "positionId": 5,
  "autoRepayEnabled": true,
  "message": "Auto-repay from maturity yield enabled"
}
```

**UI Confirmation:**

```
✅ Auto-Repay Enabled

When your INVOICE-001 tokens mature on Dec 31, 2026, the platform will:
1. Use maturity proceeds to repay your loan automatically
2. Return any excess funds to your wallet

You can disable this setting anytime in Position Settings.

[Continue to Borrow]
```

**Step 8.4: Proceed with Borrow**

Continue with normal borrow flow (Flow 2).

**Step 8.5: Dashboard Display**

On the dashboard, show auto-repay status:

```javascript
GET /solvency/position/{positionId}

Response:
{
  "positionId": 5,
  "autoRepayEnabled": true,
  "maturityDate": "2026-12-31T00:00:00Z",
  "repaymentDueDate": "2026-06-30T00:00:00Z",
  // ... other position data
}
```

**UI Badge on Position Card:**

```
Position #5
Collateral: 90 INVOICE-001
Debt: $50,000
Health Factor: 153%
🔄 Auto-Repay Enabled
```

---

## Admin User Flows

### Admin Flow 1: Review Pending Private Asset Requests

**Page:** Admin - Private Asset Requests

**UI Components:**

1. **Filters**
   - Status: ALL, PENDING, APPROVED, REJECTED
   - Asset Type: ALL, DEED, BOND, INVOICE, EQUIPMENT, OTHER
   - Date Range: Last 7 days, Last 30 days, Custom

2. **Requests Table**
   - Request ID
   - Asset Name
   - Requester Address
   - Asset Type
   - Claimed Valuation
   - Submitted Date
   - Status
   - Actions (View, Approve, Reject)

**Backend Integration:**

```javascript
// Fetch all requests (with optional filters)
GET /admin/solvency/private-asset/requests?status=PENDING
Headers: { "Authorization": "Bearer {adminJwt}" }

Response:
{
  "success": true,
  "count": 3,
  "requests": [
    {
      "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "requesterAddress": "0xUser123...",
      "requesterRole": "ORIGINATOR",
      "name": "123 Main St Property Deed",
      "assetType": "DEED",
      "location": "California, USA",
      "claimedValuation": "500000000000",  // User's claim: $500k
      "documentHash": "QmX4H8Yp9kqZ...",
      "documentUrl": "https://ipfs.io/ipfs/QmX4H8Yp9kqZ...",
      "description": "Single-family home, 3 bed 2 bath",
      "status": "PENDING",
      "createdAt": "2026-01-04T10:00:00Z"
    },
    // ... more requests
  ]
}
```

**UI Display:**

```
Private Asset Requests (3 Pending)

Filters: [Status: PENDING ▼] [Asset Type: ALL ▼] [Last 30 days ▼] [Search...]

┌──────────────────────────────────────────────────────────────────────────┐
│ Request ID: a1b2c3d4... │ Status: PENDING │ Submitted: Jan 4, 10:00 AM  │
├──────────────────────────────────────────────────────────────────────────┤
│ Asset: 123 Main St Property Deed                                        │
│ Type: DEED │ Location: California, USA                                  │
│ Requester: 0xUser123... (ORIGINATOR)                                    │
│ Claimed Valuation: $500,000.00                                          │
│                                                                          │
│ [View Details] [Approve] [Reject]                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Admin Flow 2: Review Request Details

**Page:** Admin - Request Details

**Backend Integration:**

```javascript
GET /admin/solvency/private-asset/request/{requestId}
Headers: { "Authorization": "Bearer {adminJwt}" }

Response:
{
  "success": true,
  "request": {
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "requesterAddress": "0xUser123...",
    "requesterRole": "ORIGINATOR",
    "name": "123 Main St Property Deed",
    "assetType": "DEED",
    "location": "California, USA",
    "claimedValuation": "500000000000",
    "documentHash": "QmX4H8Yp9kqZ...",
    "documentUrl": "https://ipfs.io/ipfs/QmX4H8Yp9kqZ...",
    "description": "Single-family home, 3 bed 2 bath, recent appraisal included",
    "metadata": {
      "fileSize": 2048576,
      "fileType": "application/pdf",
      "additionalNotes": "Certified appraisal attached"
    },
    "status": "PENDING",
    "createdAt": "2026-01-04T10:00:00Z"
  }
}
```

**UI Display:**

```
Private Asset Request - Details

Request ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Status: PENDING
Submitted: Jan 4, 2026 10:00 AM

──────────────────────────────────────────────────
Asset Information
──────────────────────────────────────────────────
Asset Name: 123 Main St Property Deed
Asset Type: Property Deed (DEED)
Location: California, USA
Description: Single-family home, 3 bed 2 bath, recent appraisal included

──────────────────────────────────────────────────
Valuation
──────────────────────────────────────────────────
Claimed Valuation: $500,000.00 (by user)

──────────────────────────────────────────────────
Requester Information
──────────────────────────────────────────────────
Wallet Address: 0xUser123...
Role: ORIGINATOR
KYC Status: ✅ Verified

──────────────────────────────────────────────────
Documents
──────────────────────────────────────────────────
Document Type: PDF
File Size: 2.05 MB
Document Hash: QmX4H8Yp9kqZ...
[View on IPFS] [Download]

──────────────────────────────────────────────────
Admin Actions
──────────────────────────────────────────────────

Approve this request:
Final Valuation (USD): [$ 450,000.00] (Your professional assessment)
Admin Notes: [Approved based on recent appraisal...]

[Approve Request]

Or reject:
Rejection Reason: [Insufficient documentation...]

[Reject Request]

[Back to Requests]
```

---

### Admin Flow 3: Approve Private Asset Request

**UI Action:**
- Admin reviews documents, determines final valuation
- Admin enters final valuation: $450,000 (instead of user's $500k claim)
- Admin enters notes: "Approved based on recent appraisal, reduced from claimed $500k to $450k market value"
- Admin clicks "Approve Request"

**Backend Integration:**

```javascript
POST /admin/solvency/private-asset/approve/{requestId}
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer {adminJwt}"
}
Body: {
  "finalValuation": "450000000000",  // $450,000 (6 decimals)
  "notes": "Approved based on recent appraisal, reduced from claimed $500k to $450k market value"
}

Response:
{
  "success": true,
  "message": "Private asset request approved and token minted",
  "tokenAddress": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  "tokenSymbol": "DEED-001",
  "mintTxHash": "0xmno345...",
  "finalValuation": "450000000000",
  "depositTxHash": "0xpqr678...",
  "solvencyPositionId": 5,
  "oaidCreditLimit": "270000000000"  // 60% LTV = $270k
}
```

**What Happens on Backend:**
1. Platform mints 1 whole PrivateAsset token (non-fractionalized)
2. Token is automatically deposited to SolvencyVault on user's behalf
3. Position is created with 60% LTV
4. OAID credit line is created with $270k limit
5. User is notified

**UI Display:**

```
✅ Private Asset Request Approved

Token Minted: DEED-001 (0x9fE4...fa6e0)
Mint Transaction: 0xmno345... [View on Explorer]

Final Valuation: $450,000.00
Credit Line Created: $270,000.00 (60% LTV)

Token Deposited to Vault: Position #5
Deposit Transaction: 0xpqr678... [View on Explorer]

User Notification: ✅ Sent

The user can now borrow up to $270,000 USDC using this collateral.

[View Position] [Back to Requests]
```

---

### Admin Flow 4: Reject Private Asset Request

**UI Action:**
- Admin enters rejection reason: "Insufficient documentation provided. Please submit certified appraisal."
- Admin clicks "Reject Request"

**Backend Integration:**

```javascript
POST /admin/solvency/private-asset/reject/{requestId}
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer {adminJwt}"
}
Body: {
  "rejectionReason": "Insufficient documentation provided. Please submit certified appraisal."
}

Response:
{
  "success": true,
  "message": "Private asset request rejected",
  "rejectionReason": "Insufficient documentation provided. Please submit certified appraisal.",
  "reviewedAt": "2026-01-04T12:00:00Z"
}
```

**UI Display:**

```
❌ Private Asset Request Rejected

Request ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Rejection Reason: Insufficient documentation provided. Please submit certified appraisal.

User Notification: ✅ Sent

[Back to Requests]
```

---

### Admin Flow 5: Monitor Liquidatable Positions

**Page:** Admin - Liquidation Dashboard

**UI Components:**

1. **Health Status Summary**
   - Critical Count (health < 100%)
   - Warning Count (health 100-110%)
   - Healthy Count (health > 110%)

2. **Liquidatable Positions Table**
   - Position ID
   - User Address
   - Collateral Value
   - Outstanding Debt
   - Health Factor
   - Days in Warning
   - Recommended Action
   - Actions (Liquidate, Notify User)

**Backend Integration:**

```javascript
GET /admin/solvency/liquidatable
Headers: { "Authorization": "Bearer {adminJwt}" }

Response:
{
  "positions": [
    {
      "positionId": 2,
      "userAddress": "0xUser123...",
      "collateralValue": "7000000000",      // $7,000
      "outstandingDebt": "7500000000",      // $7,500
      "healthFactor": 9333,                 // 93.33% (CRITICAL!)
      "daysSinceWarning": 3,
      "recommendedAction": "LIQUIDATE"
    },
    {
      "positionId": 7,
      "userAddress": "0xUser456...",
      "collateralValue": "11000000000",     // $11,000
      "outstandingDebt": "10500000000",     // $10,500
      "healthFactor": 10476,                // 104.76% (WARNING)
      "daysSinceWarning": 1,
      "recommendedAction": "NOTIFY"
    }
  ],
  "meta": {
    "total": 2,
    "criticalCount": 1,    // Health < 100%
    "warningCount": 1      // Health 100-110%
  }
}
```

**UI Display:**

```
Liquidation Dashboard

Health Status:
🔴 Critical (< 100%): 1 position
🟡 Warning (100-110%): 1 position
🟢 Healthy (> 110%): 47 positions

Positions Requiring Action (2)

┌──────────────────────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL - Position #2                                                │
├──────────────────────────────────────────────────────────────────────────┤
│ User: 0xUser123... │ Collateral: $7,000 │ Debt: $7,500                  │
│ Health Factor: 93.33% (LIQUIDATABLE!)                                   │
│ Days in Warning: 3 days                                                  │
│                                                                          │
│ [⚡ Liquidate Position] [📧 Notify User]                                │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ 🟡 WARNING - Position #7                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│ User: 0xUser456... │ Collateral: $11,000 │ Debt: $10,500                │
│ Health Factor: 104.76% (Approaching Liquidation)                        │
│ Days in Warning: 1 day                                                   │
│                                                                          │
│ [View Position] [📧 Notify User]                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Admin Flow 6: Liquidate Position

**UI Action:**
- Admin clicks "Liquidate Position" on a critical position

**Confirmation Modal:**

```
⚠️ Confirm Liquidation

Position ID: #2
User: 0xUser123...
Collateral Value: $7,000
Outstanding Debt: $7,500
Health Factor: 93.33%

This action will:
1. Create a marketplace listing at 90% of collateral value ($6,300)
2. Mark the position as LIQUIDATED
3. Send liquidation notification to user
4. On sale: Apply proceeds to SeniorPool debt
5. Record any shortfall ($1,200 in this case)

[Confirm Liquidation] [Cancel]
```

**Backend Integration:**

```javascript
POST /admin/solvency/liquidate/{positionId}
Headers: { "Authorization": "Bearer {adminJwt}" }

Response:
{
  "success": true,
  "positionId": 2,
  "liquidation": {
    "collateralValue": "7000000000",
    "outstandingDebt": "7500000000",
    "healthFactor": 9333,
    "liquidationPrice": "6300000000",      // 90% of collateral value
    "marketplaceListingId": "0xabc..."
  },
  "transaction": {
    "hash": "0xstu901...",
    "blockNumber": 12345690
  }
}
```

**UI Display:**

```
✅ Position Liquidated

Position #2 has been liquidated.

Liquidation Details:
• Collateral Value: $7,000.00
• Outstanding Debt: $7,500.00
• Liquidation Price: $6,300.00 (10% discount)
• Marketplace Listing: 0xabc... [View Listing]

Transaction: 0xstu901... [View on Explorer]

Expected Shortfall: $1,200.00 (if sold at liquidation price)

User Notification: ✅ Sent

[Back to Dashboard]
```

---

### Admin Flow 7: Update Private Asset Valuation

**Page:** Admin - Private Assets

**UI Components:**

1. **Private Assets Table**
   - Asset ID
   - Asset Name
   - Token Symbol
   - Current Valuation
   - Last Updated
   - Actions (Update Valuation, View Details)

**Backend Integration:**

```javascript
// List all private assets
GET /admin/solvency/private-assets
Headers: { "Authorization": "Bearer {adminJwt}" }

Response:
{
  "assets": [
    {
      "assetId": "0x7d5a99...",
      "tokenAddress": "0x9fE467...",
      "name": "123 Main St Property Deed",
      "symbol": "DEED-001",
      "assetType": "DEED",
      "valuation": "450000000000",  // $450,000
      "valuationDate": "2026-01-04T12:00:00Z",
      "isActive": true,
      "affectedPositions": [2, 5]  // Position IDs using this asset
    }
  ]
}
```

**Update Valuation Modal:**

```
Update Asset Valuation

Asset: 123 Main St Property Deed (DEED-001)
Current Valuation: $450,000.00
Last Updated: Jan 4, 2026

New Valuation (USD): [$ 420,000.00]

Reason for Update:
[Market conditions changed, property reappraisal...]

⚠️ Affected Positions (2):
• Position #2: Health 104% → 97% (WILL BECOME LIQUIDATABLE!)
• Position #5: Health 153% → 143% (Still Healthy)

[Update Valuation] [Cancel]
```

**Backend Integration:**

```javascript
POST /admin/solvency/private-asset/{assetId}/update-valuation
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer {adminJwt}"
}
Body: {
  "newValuation": "420000000000"  // $420,000
}

Response:
{
  "success": true,
  "assetId": "0x7d5a99...",
  "oldValuation": "450000000000",
  "newValuation": "420000000000",
  "valuationDate": "2026-01-05T14:00:00Z",
  "affectedPositions": [
    {
      "positionId": 2,
      "oldHealthFactor": 10476,
      "newHealthFactor": 9778,
      "newStatus": "LIQUIDATABLE"
    },
    {
      "positionId": 5,
      "oldHealthFactor": 15300,
      "newHealthFactor": 14280,
      "newStatus": "HEALTHY"
    }
  ]
}
```

**UI Display:**

```
✅ Valuation Updated

Asset: 123 Main St Property Deed
Old Valuation: $450,000.00
New Valuation: $420,000.00
Change: -$30,000.00 (-6.67%)

Affected Positions (2):
• Position #2: Health 104.76% → 97.78% ⚠️ NOW LIQUIDATABLE
• Position #5: Health 153.00% → 142.80% ✅ Still Healthy

User Notifications: ✅ Sent (2 users notified)

[Back to Assets]
```

---

## API Reference & Integration Points

### Complete API Endpoint List

#### Authentication

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| GET | `/auth/challenge` | Get authentication challenge | `getJWTToken()` L123-169 |
| POST | `/auth/login` | Login with signature | `getJWTToken()` L123-169 |

#### User - Positions

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| GET | `/solvency/positions/my` | Get all user positions | - |
| GET | `/solvency/position/{id}` | Get position details | `getPositionOnChain()` L304-322 |
| POST | `/solvency/sync-position` | Sync on-chain position to backend | `syncPositionWithBackend()` L324-359 |

#### User - Deposit & Borrow

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| POST | `/solvency/deposit` | Deposit collateral (DEPRECATED - use on-chain) | - |
| POST | `/solvency/borrow` | Borrow USDC (DEPRECATED - use on-chain) | - |

**Note:** Deposit and borrow are done directly on-chain by the user. The backend's role is to sync the on-chain data to the database for display and notifications.

#### User - Repayment & Withdrawal

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| POST | `/solvency/repay` | Repay loan (DEPRECATED - use on-chain) | - |
| POST | `/solvency/withdraw` | Withdraw collateral (DEPRECATED - use on-chain) | - |

#### User - OAID Credit

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| GET | `/solvency/oaid/my-credit` | Get OAID credit lines | `fetchOAIDCredit()` L361-401 |

#### User - Private Assets

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| POST | `/solvency/private-asset/upload-request` | Submit private asset request | - |
| GET | `/solvency/private-asset/my-requests` | Get user's requests | - |
| GET | `/solvency/private-asset/request/{id}` | Get request details | - |

#### Admin - Private Asset Management

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| GET | `/admin/solvency/private-asset/requests` | Get all requests | - |
| GET | `/admin/solvency/private-asset/requests/pending` | Get pending requests | - |
| GET | `/admin/solvency/private-asset/request/{id}` | Get request details | - |
| POST | `/admin/solvency/private-asset/approve/{id}` | Approve request (mints & deposits) | - |
| POST | `/admin/solvency/private-asset/reject/{id}` | Reject request | - |
| POST | `/admin/solvency/private-asset/mint` | Direct mint (LEGACY) | - |

#### Admin - Valuation Management

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| POST | `/admin/solvency/private-asset/{assetId}/update-valuation` | Update asset valuation | - |

#### Admin - Liquidation

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| GET | `/admin/solvency/liquidatable` | Get liquidatable positions | - |
| POST | `/admin/solvency/liquidate/{id}` | Trigger liquidation | - |

#### Admin - Token Management

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| POST | `/admin/solvency/approve-token` | Approve token for vault | - |

#### Assets

| Method | Endpoint | Description | Script Function |
|--------|----------|-------------|-----------------|
| GET | `/assets/{assetId}` | Get asset details | Main script L428-461 |

---

### On-Chain Contract Calls

#### ERC20 Token (RWA Token, USDC)

```javascript
// ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

// Check balance
const balance = await tokenContract.balanceOf(userAddress);

// Approve spending
const tx = await tokenContract.approve(spenderAddress, amount);
await tx.wait();

// Check allowance
const allowance = await tokenContract.allowance(userAddress, spenderAddress);
```

**Script Functions:**
- `checkTokenBalance()` L171-180
- `approveToken()` L182-199

#### SolvencyVault Contract

```javascript
// ABI
const SOLVENCY_VAULT_ABI = [
  'function depositCollateral(address collateralToken, uint256 collateralAmount, uint256 tokenValueUSD, uint8 tokenType, bool issueOAID) external returns (uint256 positionId)',
  'function borrowUSDC(uint256 positionId, uint256 amount) external',
  'function repayLoan(uint256 positionId, uint256 amount) external',
  'function withdrawCollateral(uint256 positionId, uint256 amount) external',
  'function positions(uint256) view returns (address user, address collateralToken, uint256 collateralAmount, uint256 usdcBorrowed, uint256 tokenValueUSD, uint256 createdAt, bool active, uint8 tokenType)',
  'event PositionCreated(uint256 indexed positionId, address indexed user, address collateralToken, uint256 collateralAmount, uint256 tokenValueUSD, uint8 tokenType)',
  'event USDCBorrowed(uint256 indexed positionId, uint256 amount, uint256 totalDebt)',
];

// Deposit collateral
const tx = await solvencyVaultContract.depositCollateral(
  tokenAddress,       // RWA token address
  amount,             // Amount in wei (18 decimals)
  tokenValueUSD,      // USD value (6 decimals)
  0,                  // TokenType: 0 = RWA, 1 = PRIVATE_ASSET
  true                // issueOAID: true to create OAID credit line
);
const receipt = await tx.wait();

// Parse PositionCreated event
const event = receipt.logs.find(log =>
  log.topics[0] === ethers.id("PositionCreated(uint256,address,address,uint256,uint256,uint8)")
);
const positionId = ethers.decodeLog(event).positionId;

// Borrow USDC
const tx = await solvencyVaultContract.borrowUSDC(positionId, amount);
await tx.wait();

// Repay loan
const tx = await solvencyVaultContract.repayLoan(positionId, amount);
await tx.wait();

// Withdraw collateral
const tx = await solvencyVaultContract.withdrawCollateral(positionId, amount);
await tx.wait();

// Get position details
const position = await solvencyVaultContract.positions(positionId);
```

**Script Functions:**
- `depositCollateral()` L201-256
- `borrowUSDC()` L258-302
- `getPositionOnChain()` L304-322

---

## UI States & Display Logic

### Health Factor Display

```javascript
// Health Factor Calculation
// Backend returns healthFactor as basis points (10000 = 100%)
const healthFactorBps = 15300; // Example: 153%
const healthPercent = (healthFactorBps / 100).toFixed(2) + "%"; // "153.00%"

// Color Coding
function getHealthFactorColor(healthFactor) {
  if (healthFactor === 0) return "gray";       // No debt
  if (healthFactor >= 15000) return "green";   // Healthy (>150%)
  if (healthFactor >= 12500) return "yellow";  // Caution (125-150%)
  if (healthFactor >= 11000) return "orange";  // Warning (110-125%)
  return "red";                                 // Liquidatable (<110%)
}

// Status Badge
function getHealthStatus(healthFactor) {
  if (healthFactor === 0) return "No Debt";
  if (healthFactor >= 15000) return "Healthy ✅";
  if (healthFactor >= 12500) return "Caution ⚠️";
  if (healthFactor >= 11000) return "Warning ⚠️";
  return "Liquidatable 🔴";
}

// Display
<HealthBadge color={getHealthFactorColor(position.healthFactor)}>
  {healthPercent} - {getHealthStatus(position.healthFactor)}
</HealthBadge>
```

### USD Amount Formatting

```javascript
// Backend returns amounts in 6 decimals (USDC format)
// Example: "76500000000" = $76,500.00

function formatUSDC(amount) {
  // Convert from 6 decimals to readable format
  const dollars = Number(amount) / 1e6;
  return "$" + dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Example:
formatUSDC("76500000000")  // "$76,500.00"
formatUSDC("53550000000")  // "$53,550.00"
formatUSDC("41100000")     // "$41.10"
```

### Token Amount Formatting

```javascript
// Backend returns amounts in 18 decimals (wei format)
// Example: "90000000000000000000" = 90 tokens

function formatTokenAmount(amountWei, decimals = 18) {
  return ethers.formatUnits(amountWei, decimals);
}

// Example:
formatTokenAmount("90000000000000000000", 18)  // "90.0"
```

### LTV (Loan-to-Value) Display

```javascript
// Calculate current LTV
function calculateCurrentLTV(debt, collateralValue) {
  if (collateralValue === 0) return 0;
  const ltv = (Number(debt) / Number(collateralValue)) * 100;
  return ltv.toFixed(2) + "%";
}

// Example:
// Debt: $50,000, Collateral: $76,500
// LTV: (50000 / 76500) * 100 = 65.36%

// Display max LTV
const maxLTV = position.tokenType === "RWA" ? "70%" : "60%";

// Display
<LTVDisplay>
  Current LTV: {calculateCurrentLTV(position.outstandingDebt, position.tokenValueUSD)}
  / Max: {maxLTV}
</LTVDisplay>
```

### Utilization Rate Display

```javascript
// OAID Credit Utilization
function calculateUtilizationRate(creditUsed, creditLimit) {
  if (creditLimit === 0) return "0.00%";
  const utilization = (Number(creditUsed) / Number(creditLimit)) * 100;
  return utilization.toFixed(2) + "%";
}

// Example:
// Used: $20,000, Limit: $35,000
// Utilization: (20000 / 35000) * 100 = 57.14%

// Color coding
function getUtilizationColor(rate) {
  const numRate = parseFloat(rate);
  if (numRate < 50) return "green";
  if (numRate < 75) return "yellow";
  return "red";
}
```

### Date & Time Display

```javascript
// Backend returns ISO 8601 format
// Example: "2026-01-04T10:00:00Z"

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Example:
formatDate("2026-01-04T10:00:00Z")  // "Jan 4, 2026, 10:00 AM"

// Relative time (for "X days ago")
function timeAgo(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return diffDays + " days ago";
}
```

### Status Badges

```javascript
// Position Status
const statusConfig = {
  "ACTIVE": { color: "green", icon: "✅", label: "Active" },
  "LIQUIDATED": { color: "red", icon: "⚠️", label: "Liquidated" },
  "REPAID": { color: "blue", icon: "💰", label: "Repaid" },
  "CLOSED": { color: "gray", icon: "🔒", label: "Closed" }
};

// Private Asset Request Status
const requestStatusConfig = {
  "PENDING": { color: "yellow", icon: "⏳", label: "Pending Review" },
  "APPROVED": { color: "green", icon: "✅", label: "Approved" },
  "REJECTED": { color: "red", icon: "❌", label: "Rejected" }
};

// Display
<StatusBadge color={statusConfig[position.status].color}>
  {statusConfig[position.status].icon} {statusConfig[position.status].label}
</StatusBadge>
```

---

## Error Handling

### Common Error Scenarios

#### 1. Insufficient Collateral

```javascript
// User tries to borrow more than LTV allows

// Validation (frontend)
if (borrowAmount > maxBorrowCapacity) {
  showError(`Insufficient collateral. You can borrow up to ${formatUSDC(maxBorrowCapacity)}.`);
  return;
}

// On-chain error (if validation missed)
// Error: "Insufficient collateral"
// Display: "❌ Borrow failed: Insufficient collateral. Maximum borrowable: $53,550.00"
```

#### 2. Insufficient Balance

```javascript
// User tries to deposit more tokens than they have

// Validation (frontend)
const balance = await tokenContract.balanceOf(userAddress);
if (depositAmount > balance) {
  showError(`Insufficient balance. You have ${formatTokenAmount(balance)} ${symbol}.`);
  return;
}

// On-chain error
// Error: "ERC20: transfer amount exceeds balance"
// Display: "❌ Deposit failed: Insufficient token balance."
```

#### 3. Insufficient Allowance

```javascript
// User hasn't approved token spending

// Check before transaction
const allowance = await tokenContract.allowance(userAddress, vaultAddress);
if (allowance < amount) {
  // Show approval step first
  showApprovalModal();
  return;
}

// On-chain error (if allowance check missed)
// Error: "ERC20: insufficient allowance"
// Display: "❌ Transaction failed: Please approve token spending first."
```

#### 4. Outstanding Debt (Withdrawal)

```javascript
// User tries to withdraw collateral with outstanding debt

// Validation (frontend)
if (position.outstandingDebt > 0) {
  showError(`Cannot withdraw. You have outstanding debt of ${formatUSDC(position.outstandingDebt)}. Please repay your loan first.`);
  return;
}

// On-chain error
// Error: "Cannot withdraw with outstanding debt"
// Display: "❌ Withdrawal failed: Please repay your loan before withdrawing collateral."
```

#### 5. Health Factor Too Low

```javascript
// User tries to borrow but it would make health factor < 100%

// Validation (frontend)
const newHealthFactor = calculateNewHealthFactor(collateralValue, currentDebt, borrowAmount);
if (newHealthFactor < 11000) {
  showError(`This borrow would put your position at risk of liquidation. Health factor would be ${(newHealthFactor/100).toFixed(2)}%, which is below the 110% threshold.`);
  return;
}

// On-chain error
// Error: "Health factor too low"
// Display: "❌ Borrow failed: This would make your position liquidatable. Please borrow a smaller amount."
```

#### 6. Position Not Found

```javascript
// Invalid position ID

// Backend error response
{
  "error": "Position not found",
  "message": "Position with ID 999 does not exist",
  "statusCode": 404
}

// Display
showError("Position not found. Please check the position ID and try again.");
```

#### 7. Unauthorized Access

```javascript
// User tries to access another user's position

// Backend error response
{
  "error": "Forbidden",
  "message": "You do not own this position",
  "statusCode": 403
}

// Display
showError("Access denied. You can only access your own positions.");
```

#### 8. Network Errors

```javascript
// Transaction failed due to network issues

try {
  const tx = await contract.method();
  await tx.wait();
} catch (error) {
  if (error.code === "NETWORK_ERROR") {
    showError("Network error. Please check your connection and try again.");
  } else if (error.code === "TIMEOUT") {
    showError("Transaction timeout. The network may be congested. Please try again later.");
  } else if (error.code === "INSUFFICIENT_FUNDS") {
    showError("Insufficient funds for gas. Please add more MNT to your wallet.");
  } else {
    showError("Transaction failed: " + error.message);
  }
}
```

#### 9. User Rejection

```javascript
// User rejects transaction in wallet

try {
  const tx = await contract.method();
  await tx.wait();
} catch (error) {
  if (error.code === "ACTION_REJECTED") {
    showWarning("Transaction cancelled by user.");
  } else {
    showError("Transaction failed: " + error.message);
  }
}
```

### Error Display Components

```javascript
// Error Toast/Notification
function showError(message) {
  toast({
    title: "Error",
    description: message,
    status: "error",
    duration: 5000,
    isClosable: true
  });
}

// Warning Toast
function showWarning(message) {
  toast({
    title: "Warning",
    description: message,
    status: "warning",
    duration: 5000,
    isClosable: true
  });
}

// Success Toast
function showSuccess(message) {
  toast({
    title: "Success",
    description: message,
    status: "success",
    duration: 5000,
    isClosable: true
  });
}

// Error Modal (for critical errors)
function showErrorModal(title, message, details) {
  return (
    <Modal>
      <ModalHeader>❌ {title}</ModalHeader>
      <ModalBody>
        <Text>{message}</Text>
        {details && (
          <Box mt={4} p={3} bg="red.50" borderRadius="md">
            <Text fontSize="sm" color="red.700">{details}</Text>
          </Box>
        )}
      </ModalBody>
      <ModalFooter>
        <Button onClick={closeModal}>Close</Button>
      </ModalFooter>
    </Modal>
  );
}
```

---

## Edge Cases & Special Scenarios

### Edge Case 1: Zero Debt Position

**Scenario:** User has deposited collateral but never borrowed

**Backend Response:**
```javascript
{
  "positionId": 5,
  "collateralAmount": "90000000000000000000",
  "tokenValueUSD": "76500000000",
  "usdcBorrowed": "0",
  "outstandingDebt": "0",
  "healthFactor": 0,              // No debt = no health factor
  "healthStatus": "HEALTHY",
  "status": "ACTIVE",
  "maxBorrowCapacity": "53550000000"
}
```

**UI Display:**
- Health Factor: Display as "N/A" (not "0%")
- Show message: "No outstanding debt. You can borrow up to $53,550.00"
- Withdraw button: Enabled (no debt to repay)

### Edge Case 2: Over-Borrowed (Edge Case Due to Interest)

**Scenario:** User borrowed max amount, then interest accrued, pushing debt over LTV

**Backend Response:**
```javascript
{
  "positionId": 5,
  "tokenValueUSD": "76500000000",      // $76,500
  "usdcBorrowed": "53550000000",        // Borrowed: $53,550 (70% LTV)
  "outstandingDebt": "53591100000",     // With interest: $53,591.10
  "healthFactor": 14198,                // 141.98% (still healthy)
  "maxBorrowCapacity": "53550000000",
  "remainingBorrowCapacity": "-41100000" // Negative! Over-borrowed by $41.10
}
```

**UI Display:**
- Display: "Remaining Borrow Capacity: $0.00" (don't show negative)
- Show info message: "You've reached your borrowing limit. Repay some debt to borrow more."
- Borrow button: Disabled
- Health Factor: Still show actual value (141.98%)

### Edge Case 3: Partial Withdrawal

**Scenario:** User withdraws only part of collateral (not closing position)

**Backend Response After Withdrawal:**
```javascript
{
  "positionId": 5,
  "collateralAmount": "67500000000000000000",  // Reduced from 90 to 67.5
  "tokenValueUSD": "57375000000",              // Reduced from $76,500 to $57,375
  "outstandingDebt": "0",
  "status": "ACTIVE",                          // Still active!
  "maxBorrowCapacity": "40162500000"           // Reduced
}
```

**UI Display:**
- Position status: Still "Active" (not "Closed")
- Show message: "Collateral reduced. Your credit line has been adjusted."
- Display new credit limit
- Allow user to borrow again or withdraw more

### Edge Case 4: Asset Revaluation (Price Drop)

**Scenario:** Admin updates private asset valuation downward, affecting health factor

**Before:**
```javascript
{
  "positionId": 2,
  "tokenValueUSD": "500000000000",      // $500,000
  "outstandingDebt": "300000000000",    // $300,000
  "healthFactor": 16666                 // 166.66%
}
```

**Admin Updates Valuation:**
```javascript
POST /admin/solvency/private-asset/{assetId}/update-valuation
Body: { "newValuation": "320000000000" }  // Drop to $320,000
```

**After:**
```javascript
{
  "positionId": 2,
  "tokenValueUSD": "320000000000",      // Updated to $320,000
  "outstandingDebt": "300000000000",    // Same $300,000
  "healthFactor": 10666,                // 106.66% (WARNING!)
  "healthStatus": "WARNING"
}
```

**UI Notification to User:**

```
⚠️ Collateral Value Updated

Your collateral for Position #2 has been revalued by an administrator.

Previous Value: $500,000.00
New Value: $320,000.00
Change: -$180,000.00 (-36%)

⚠️ Your health factor has dropped to 106.66%, which is approaching the liquidation threshold of 110%.

Recommended Actions:
• [Repay $30,000] → Bring health factor above 125%
• [Add More Collateral] → Increase collateral value

If your health factor drops below 110%, your position may be liquidated.

[View Position] [Repay Now]
```

### Edge Case 5: Liquidation During Repayment

**Scenario:** User is repaying, but admin liquidates position before transaction confirms

**UI Handling:**

1. **Before Repayment:**
   - User initiates repayment transaction
   - Show: "Processing repayment..."

2. **During Repayment (Admin Liquidates):**
   - Admin triggers liquidation
   - Position status changes to "LIQUIDATED"

3. **Repayment Transaction Confirms:**
   - On-chain call may fail (position already liquidated)
   - Error: "Position has been liquidated"

4. **UI Display:**
```
❌ Repayment Failed

Your position was liquidated while your repayment transaction was processing.

Your repayment transaction has been reverted.
No funds were deducted from your wallet.

Position Status: LIQUIDATED
Liquidation Time: Jan 5, 2026, 2:15 PM

[View Liquidation Details] [Back to Dashboard]
```

### Edge Case 6: Multiple Positions Same User

**Scenario:** User has multiple positions with different collateral types

**Backend Response:**
```javascript
{
  "positions": [
    {
      "positionId": 5,
      "collateralToken": { "symbol": "INVOICE-001", "type": "RWA" },
      "tokenValueUSD": "76500000000",
      "usdcBorrowed": "50000000000",
      "healthFactor": 15300,
      "maxBorrowCapacity": "53550000000"  // 70% LTV
    },
    {
      "positionId": 8,
      "collateralToken": { "symbol": "DEED-001", "type": "PRIVATE_ASSET" },
      "tokenValueUSD": "450000000000",
      "usdcBorrowed": "270000000000",
      "healthFactor": 16666,
      "maxBorrowCapacity": "270000000000"  // 60% LTV
    }
  ]
}
```

**UI Display:**

```
Your Positions (2)

┌─────────────────────────────────────────────────────────────┐
│ Position #5 - INVOICE-001 (RWA) ✅                          │
├─────────────────────────────────────────────────────────────┤
│ Collateral: 90 INVOICE-001 ($76,500)                       │
│ Borrowed: $50,000 / $53,550 max (70% LTV)                  │
│ Health Factor: 153.00% (Healthy ✅)                         │
│ [Borrow More] [Repay] [View Details]                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Position #8 - DEED-001 (Private Asset) ✅                   │
├─────────────────────────────────────────────────────────────┤
│ Collateral: 1 DEED-001 ($450,000)                          │
│ Borrowed: $270,000 / $270,000 max (60% LTV)                │
│ Health Factor: 166.66% (Healthy ✅)                         │
│ Utilization: 100% (Maxed out)                              │
│ [Repay] [View Details]                                     │
└─────────────────────────────────────────────────────────────┘

Total OAID Credit:
• Combined Credit Limit: $323,550.00
• Combined Credit Used: $320,000.00
• Available Credit: $3,550.00
• Utilization: 98.90%
```

### Edge Case 7: OAID Credit Line Not Created

**Scenario:** User deposited collateral but OAID credit line wasn't created (bug or issueOAID = false)

**Backend Response:**
```javascript
{
  "positionId": 5,
  "collateralAmount": "90000000000000000000",
  "tokenValueUSD": "76500000000",
  "oaidCreditLineId": null,  // No OAID!
  "status": "ACTIVE"
}
```

**UI Display:**

```
Position #5

⚠️ OAID Credit Line Not Active

Your position does not have an OAID credit line. You can:
• Borrow directly from this platform
• [Create OAID Credit Line] → Enable borrowing on partner protocols

Note: Creating an OAID credit line does not affect your current position.

[Create OAID Credit Line]
```

**Action:**
```javascript
// User clicks "Create OAID Credit Line"
POST /solvency/position/{positionId}/create-oaid
Headers: { "Authorization": "Bearer {jwt}" }

Response:
{
  "success": true,
  "oaidCreditLineId": 1,
  "creditLimit": "53550000000"
}
```

### Edge Case 8: Transaction Pending (Long Confirmation Time)

**Scenario:** User submits transaction but it takes 5+ minutes to confirm

**UI Handling:**

1. **Transaction Submitted:**
```
⏳ Transaction Pending

Your transaction has been submitted and is waiting for confirmation.

Transaction Hash: 0xabc123...
[View on Explorer]


Current Status: ⏳ Pending (0/1 confirmations)

You can close this page. We'll notify you when the transaction confirms.

[View in Wallet] [Close]
```

2. **Polling Status:**
```javascript
// Poll transaction status every 5 seconds
const checkTxStatus = async (txHash) => {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (receipt) {
    if (receipt.status === 1) {
      showSuccess("Transaction confirmed!");
      refreshData();
    } else {
      showError("Transaction failed!");
    }
  } else {
    // Still pending, check again in 5 seconds
    setTimeout(() => checkTxStatus(txHash), 5000);
  }
};
```

3. **Timeout (>10 minutes):**
```
⚠️ Transaction Taking Longer Than Expected

Your transaction is still pending after 10 minutes.

Possible reasons:
• Network congestion
• Gas price too low
• Validator issues

Options:
• [Check Status] → Refresh and check again
• [Speed Up] → Increase gas price (MetaMask)
• [Cancel] → Cancel the transaction (if not confirmed)

Transaction: 0xabc123... [View on Explorer]

[Check Status] [Contact Support]
```

### Edge Case 9: Admin Rejects Private Asset After Long Wait

**Scenario:** User submitted private asset request, waited 2 weeks, admin rejects

**Backend Notification:**
```javascript
{
  "type": "PRIVATE_ASSET_REJECTED",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "assetName": "123 Main St Property Deed",
  "rejectionReason": "Insufficient documentation provided. Please submit certified appraisal.",
  "reviewedAt": "2026-01-18T14:00:00Z"
}
```

**UI Notification:**

```
❌ Private Asset Request Rejected

Your private asset request has been reviewed and rejected by an administrator.

Asset: 123 Main St Property Deed
Request ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Submitted: Jan 4, 2026
Reviewed: Jan 18, 2026 (14 days later)

Rejection Reason:
"Insufficient documentation provided. Please submit certified appraisal."

What You Can Do:
• [Submit Updated Request] → Resubmit with additional documentation
• [Contact Support] → Ask for clarification
• [Use RWA Tokens Instead] → Buy tokens from marketplace

[View Request Details] [Submit New Request]
```

### Edge Case 10: Liquidation With Excess Proceeds

**Scenario:** Liquidated collateral sells for MORE than the debt (rare but possible)

**Liquidation Details:**
```javascript
{
  "positionId": 2,
  "collateralValue": "7000000000",        // $7,000
  "outstandingDebt": "6500000000",        // $6,500
  "liquidationPrice": "6300000000",       // Listed at $6,300 (90%)
  "actualSalePrice": "6800000000",        // Sold for $6,800!
  "debtRecovered": "6500000000",          // $6,500 paid to pool
  "excess": "300000000"                   // $300 returned to user
}
```

**UI Notification to User:**

```
⚠️ Your Position Was Liquidated

Position #2 was liquidated due to low health factor.

Liquidation Details:
• Collateral Value: $7,000.00
• Outstanding Debt: $6,500.00
• Sale Price: $6,800.00

Good News:
Your collateral sold for more than your debt!

• Debt Paid: $6,500.00 ✅
• Excess Returned to You: $300.00 💰

The excess has been transferred to your wallet.

[View Transaction] [Back to Dashboard]
```

---

## Summary of Key Integration Points

### Critical Functions from Script to Implement

1. **Authentication:** `getJWTToken()` (L123-169)
2. **Check Balance:** `checkTokenBalance()` (L171-180)
3. **Approve Token:** `approveToken()` (L182-199)
4. **Deposit Collateral:** `depositCollateral()` (L201-256)
5. **Borrow USDC:** `borrowUSDC()` (L258-302)
6. **Get Position:** `getPositionOnChain()` (L304-322)
7. **Sync Backend:** `syncPositionWithBackend()` (L324-359)
8. **Fetch Credit:** `fetchOAIDCredit()` (L361-401)

### Critical Backend Endpoints

**Must Implement:**
- `GET /assets/{assetId}` - Get token details
- `POST /solvency/sync-position` - Sync on-chain position to backend
- `GET /solvency/oaid/my-credit` - Get OAID credit lines
- `GET /solvency/positions/my` - Get all user positions
- `GET /solvency/position/{id}` - Get position details
- `POST /solvency/private-asset/upload-request` - Submit private asset
- `GET /solvency/private-asset/my-requests` - Get user's requests
- `POST /admin/solvency/private-asset/approve/{id}` - Approve private asset

**Important:** Most transactions (deposit, borrow, repay, withdraw) are done on-chain by the user. The backend's role is to sync on-chain data to the database and provide it to the frontend for display.

### User Flows Coverage

✅ **Investor Flows Covered:**
1. Borrow from partner protocol (with sufficient collateral)
2. Borrow from partner protocol (need more collateral)
3. Upload off-chain asset (private asset)
4. Wait for admin approval
5. Deposit RWA tokens from marketplace
6. Repay loan (partial and full)
7. Withdraw collateral (partial and full)
8. Handle maturity mismatch
9. Monitor health factor
10. View OAID credit lines

✅ **Admin Flows Covered:**
1. Review pending private asset requests
2. View request details
3. Approve private asset request (mints token + deposits + creates OAID)
4. Reject private asset request
5. Monitor liquidatable positions
6. Trigger liquidation
7. Update private asset valuations
8. View affected positions after valuation update

✅ **Edge Cases Covered:**
1. Zero debt position
2. Over-borrowed (due to interest)
3. Partial withdrawal
4. Asset revaluation (price drop)
5. Liquidation during repayment
6. Multiple positions same user
7. OAID credit line not created
8. Transaction pending (long confirmation)
9. Admin rejects asset after long wait
10. Liquidation with excess proceeds

---

## Next Steps for Frontend Developer

1. **Read this entire document** to understand the full flow
2. **Review the script** (`deposit-to-solvency-vault.js`) for exact function implementations
3. **Set up contract ABIs** (ERC20, SolvencyVault) from the script
5. **Build dashboard page** to display positions and credit lines
6. **Implement deposit flow** following the step-by-step guide
7. **Implement borrow flow** with health factor calculations
8. **Implement repayment flow** with validation
9. **Implement private asset submission form**
10. **Add admin pages** for request review and liquidation management
11. **Test all edge cases** listed in this document
12. **Add error handling** for all scenarios
13. **Implement real-time notifications** (SSE or polling)
14. **Strict gatekeeping shoudl be at each point wherever required 

**Good luck with the implementation!** 🚀
