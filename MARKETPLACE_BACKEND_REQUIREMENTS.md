# Marketplace Backend Requirements

## Overview

This document outlines the backend data requirements for the marketplace and asset details pages. The frontend has been integrated with the marketplace API and smart contract purchase functionality.

## Current API Endpoints Integrated

### 1. GET /marketplace/listings

**Purpose**: Fetch all tokenized assets available in the marketplace

**Authentication**: Required (Bearer token)

**Current Response Structure**:
```json
{
  "success": true,
  "count": 0,
  "listings": []
}
```

**Expected Response Structure**:
```json
{
  "success": true,
  "count": 5,
  "listings": [
    {
      "assetId": "87a17e86-d381-4f1b-8555-44acd5a84664",
      "status": "TOKENIZED",
      "metadata": {
        "invoiceNumber": "INV-2025-614382",
        "faceValue": "100000",
        "currency": "USD",
        "issueDate": "2025-01-01T00:00:00.000Z",
        "dueDate": "2025-07-01T00:00:00.000Z",
        "buyerName": "Tech Solutions Inc",
        "industry": "Technology",
        "riskTier": "A"
      },
      "tokenParams": {
        "totalSupply": "100000",
        "pricePerToken": "1",
        "minInvestment": "1000"
      }
    }
  ]
}
```

### 2. GET /marketplace/listings/:assetId

**Purpose**: Fetch detailed information about a specific asset

**Authentication**: Required (Bearer token)

**Current Response Structure**:
```json
{
  "success": true,
  "asset": {
    "assetId": "87a17e86-d381-4f1b-8555-44acd5a84664",
    "status": "TOKENIZED",
    "metadata": {
      "invoiceNumber": "INV-2025-614382",
      "faceValue": "100000",
      "currency": "USD",
      "issueDate": "2025-01-01T00:00:00.000Z",
      "dueDate": "2025-07-01T00:00:00.000Z",
      "buyerName": "Tech Solutions Inc",
      "industry": "Technology",
      "riskTier": "A"
    },
    "tokenParams": {
      "totalSupply": "100000",
      "pricePerToken": "1",
      "minInvestment": "1000"
    },
    "token": {
      "address": "0xeF031f7f75B981Ad7c0A9b31a0eBD9F8eCb1d0Db",
      "compliance": "0x65a525eE42b11E4BA6D3a7424672C9b725E5a18f",
      "deployedAt": "2025-12-24T22:17:11.255Z",
      "supply": "100000",
      "transactionHash": "0x44829ef8fdc455d1b742bf904ccd7dcf68c8382c612c6ce10ebeb0a4029c65a6"
    },
    "registry": {
      "blockNumber": 32534946,
      "registeredAt": "2025-12-24T22:16:11.671Z",
      "transactionHash": "0x9aef937eb88d352d0ec7e3a8893e9c2929411453b0c09eb7d723ad19fe9fe5e5"
    },
    "cryptography": {
      "documentHash": "0x7f39f01cb3f4d50aa5117841922bf64dd15a16b1121e3491288e38db9c971fe7",
      "merkleRoot": "0x123cf0bf6ae0db2debce3e3f7d12410439ad7ae86b51545d161209 4781100e69"
    },
    "attestation": {
      "hash": "0xe4791daa836a2ed7658e8b1207a6433da1db11ad5c3f034a011cd86bacbdca31",
      "attestor": "0x23e67597f0898f747Fa3291C8920168adF9455D0",
      "timestamp": "2025-12-24T22:15:58.086Z"
    }
  }
}
```

## Required Additional Data for Frontend Display

### For Marketplace Listing Table

The frontend needs to display the following information in the marketplace table:

1. **Asset Identification**
   - Invoice Number (from `metadata.invoiceNumber`)
   - Buyer Name (from `metadata.buyerName`)
   - Industry (from `metadata.industry`)

2. **Token Information**
   - Token Price (from `tokenParams.pricePerToken`)
   - Total Supply (from `tokenParams.totalSupply`)
   - Minimum Investment (from `tokenParams.minInvestment`)

3. **Additional Display Fields** (Currently MISSING from API):
   - **Yield APY**: Annual Percentage Yield for the asset
   - **Maturity Days**: Number of days until maturity (calculated from dueDate)
   - **Total Raised**: Amount of USDC raised so far
   - **Target Amount**: Total funding target
   - **Funding Progress**: Percentage of funding completed
   - **Listed Date**: When the asset was listed on the marketplace
   - **Category**: Asset category (invoice, real-estate, trade-finance, equipment-lease)
   - **Verified Status**: Whether the asset has been verified

### Backend Implementation Needed

Please add the following fields to the `/marketplace/listings` response:

```json
{
  "assetId": "87a17e86-d381-4f1b-8555-44acd5a84664",
  "status": "TOKENIZED",
  "metadata": {
    // ... existing fields ...
    "yieldAPY": 8.5,              // NEW: Annual yield percentage
    "category": "invoice",         // NEW: invoice|real-estate|trade-finance|equipment-lease
    "verified": true,             // NEW: Verification status
    "listedDate": "2025-12-20T00:00:00.000Z"  // NEW: When listed
  },
  "tokenParams": {
    // ... existing fields ...
  },
  "funding": {                    // NEW: Funding information
    "totalRaised": "48000",       // Amount of USDC raised
    "targetAmount": "100000",     // Total funding target
    "progress": 48                // Percentage (0-100)
  }
}
```

### For Featured Sections

The marketplace home page displays three sections:

1. **Featured Issuances**
   - Assets with 40-90% funding progress
   - Verified assets only
   - Limited to 3 assets

2. **High-Yield Opportunities**
   - Assets with yield APY >= 10%
   - Sorted by highest yield
   - Limited to 3 assets

3. **Recently Verified Assets**
   - Assets listed in the last 7 days
   - Verified status must be true
   - Sorted by most recent first
   - Limited to 3 assets

**Backend Implementation**: Please consider adding these as separate endpoints or query parameters:

```
GET /marketplace/listings?featured=true&limit=3
GET /marketplace/listings?highYield=true&limit=3
GET /marketplace/listings?recentlyVerified=true&limit=3
```

OR add filtering capabilities:
```
GET /marketplace/listings?filter=featured&limit=3
GET /marketplace/listings?filter=high-yield&limit=3
GET /marketplace/listings?filter=recently-verified&limit=3
```

### For Platform Metrics Strip

The marketplace displays the following platform-wide metrics at the top:

```typescript
interface PlatformMetrics {
  totalAssetsIssued: number;        // Total count of assets
  totalAssetsChange: number;        // Change from last period (e.g., +12)
  averageYield: number;             // Average APY across all assets
  averageYieldChange: number;       // Change in average yield (e.g., +0.15)
  totalValueTokenized: number;      // Total value in millions
  totalValueChange: number;         // Change percentage (e.g., +2.3)
  activeInvestors: number;          // Count of active investors
  activeInvestorsChange: number;    // Change from last period (e.g., +156)
  settlementsCompleted: number;     // Settlements in last 30 days
  settlementsChange: number;        // Change from previous 30 days (e.g., +45)
}
```

**Backend Implementation**: Please create an endpoint:

```
GET /marketplace/metrics
```

**Expected Response**:
```json
{
  "success": true,
  "metrics": {
    "totalAssetsIssued": 247,
    "totalAssetsChange": 12,
    "averageYield": 8.45,
    "averageYieldChange": 0.15,
    "totalValueTokenized": 142.8,
    "totalValueChange": 2.3,
    "activeInvestors": 3847,
    "activeInvestorsChange": 156,
    "settlementsCompleted": 1023,
    "settlementsChange": 45
  }
}
```

## Smart Contract Purchase Flow

The frontend has been integrated with the smart contract purchase flow. Here's what happens when a user clicks "Buy Tokens":

### 1. User Input
- User enters the number of tokens they want to buy
- Frontend calculates the total USDC cost

### 2. Smart Contract Interaction

The frontend uses the following smart contracts:

- **USDC Contract**: `0xfD61dC86e7799479597c049D7b19e6E638adDdd0`
- **PrimaryMarketplace**: `0x444a6f69FC9411d0ea9627CbDdBD3Dfa563aE615`

### Purchase Steps:

#### Step 1: Approve USDC
```javascript
await USDC.approve(marketplaceAddress, paymentAmount);
```

#### Step 2: Buy Tokens
```javascript
const assetIdBytes32 = convertAssetIdToBytes32(assetId);
await PrimaryMarketplace.buyTokens(assetIdBytes32, tokenAmountWei);
```

### 3. Backend Listener Requirements

**IMPORTANT**: The backend should listen for the `TokensPurchased` event from the PrimaryMarketplace contract:

```solidity
event TokensPurchased(
    bytes32 indexed assetId,
    address indexed buyer,
    uint256 amount,
    uint256 payment
);
```

When this event is emitted:
1. Record the purchase in the database
2. Update the `funding.totalRaised` for the asset
3. Update the `funding.progress` percentage
4. Add the purchase to the user's transaction history

## Portfolio Integration

After a successful purchase, users should see their RWA token balance in the portfolio page.

### Required Backend Endpoint

```
GET /portfolio/holdings
```

**Purpose**: Get all RWA token holdings for the authenticated user

**Expected Response**:
```json
{
  "success": true,
  "holdings": [
    {
      "assetId": "87a17e86-d381-4f1b-8555-44acd5a84664",
      "tokenAddress": "0xeF031f7f75B981Ad7c0A9b31a0eBD9F8eCb1d0Db",
      "balance": "1000",
      "purchasePrice": "1000",
      "currentValue": "1050",
      "yieldEarned": "50",
      "purchaseDate": "2025-12-24T10:00:00.000Z",
      "metadata": {
        "invoiceNumber": "INV-2025-614382",
        "buyerName": "Tech Solutions Inc",
        "dueDate": "2025-07-01T00:00:00.000Z"
      }
    }
  ]
}
```

The frontend can also fetch balances directly from the blockchain using:
```javascript
const balance = await RWAToken.balanceOf(userAddress);
```

But the backend should maintain a database record for transaction history and analytics.

## Summary

### Immediate Backend Tasks

1. **Add missing fields to /marketplace/listings**:
   - yieldAPY
   - category
   - verified
   - listedDate
   - funding.totalRaised
   - funding.targetAmount
   - funding.progress

2. **Create /marketplace/metrics endpoint**:
   - Platform-wide statistics
   - Historical changes

3. **Implement event listener for TokensPurchased**:
   - Update funding progress
   - Record user purchases
   - Update transaction history

4. **Create /portfolio/holdings endpoint**:
   - User's RWA token holdings
   - Purchase history
   - Yield information

### Optional Enhancements

1. **Add filtering capabilities to /marketplace/listings**:
   - Filter by category
   - Filter by yield range
   - Filter by funding status
   - Sort options

2. **Add search functionality**:
   - Search by invoice number
   - Search by buyer name
   - Search by industry

3. **Add pagination**:
   - Page size control
   - Total count
   - Next/previous page

## Frontend Integration Complete

The frontend has been fully integrated with:
- ✅ Marketplace listing API
- ✅ Asset details API
- ✅ Smart contract purchase flow (USDC approval + token purchase)
- ✅ Wallet balance checking (USDC and allowance)
- ✅ Purchase status feedback
- ✅ Proper error handling

Once the backend implements the missing fields and endpoints, the marketplace will be fully functional with real data.
