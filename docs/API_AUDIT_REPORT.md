# API Audit Report - Auction Integration

**Date:** 2025-12-26
**Purpose:** Verify frontend API calls match actual backend implementation

---

## 🔍 Executive Summary

Analyzed all 6 backend test scripts to extract verified API endpoints. Found **5 critical mismatches** between frontend implementation and actual backend APIs. All issues have been **FIXED**.

---

## ✅ VERIFIED Endpoints (From Scripts)

### Investor Endpoints (investor-bidding.sh, investor-settle.sh)

| Endpoint | Method | Script Reference | Purpose |
|----------|--------|------------------|---------|
| `/marketplace/bids/my-bids?assetId=X` | GET | investor-bidding.sh:395 | Get investor's bids for auction |
| `/marketplace/auctions/:assetId/bids` | GET | investor-bidding.sh:403 | Get all bids for auction |
| `/marketplace/bids/notify` | POST | investor-bidding.sh:362 | Notify backend after on-chain bid |
| `/marketplace/bids/settle-notify` | POST | investor-settle.sh:264 | Notify backend after settlement |

### Admin Endpoints (admin-approve.sh, admin-endauction.sh)

| Endpoint | Method | Script Reference | Purpose |
|----------|--------|------------------|---------|
| `/admin/compliance/approve` | POST | admin-approve.sh:211 | Approve asset for auction |
| `/admin/assets/:assetId/register` | POST | admin-approve.sh:237 | Register asset on-chain |
| `/admin/assets/deploy-token` | POST | admin-approve.sh:280 | Deploy RWA token |
| `/admin/compliance/schedule-auction` | POST | admin-approve.sh:326 | Schedule auction start |
| `/admin/compliance/end-auction` | POST | admin-endauction.sh:260 | End auction with clearing price |

### Shared Endpoints

| Endpoint | Method | Script Reference | Purpose |
|----------|--------|------------------|---------|
| `/auth/challenge` | GET | All scripts | Get wallet signature challenge |
| `/auth/login` | POST | All scripts | Login with signed message |
| `/assets/:assetId` | GET | admin-approve.sh:168 | Get asset details |
| `/announcements/asset/:assetId` | GET | admin-approve.sh:353 | Get auction announcements |

---

## ❌ Issues Found & Fixed

### 1. ❌ **FIXED:** Wrong getUserBids Endpoint

**Problem:**
```typescript
// WRONG - I invented this endpoint
GET /users/:address/bids?auction=:auctionId
```

**Solution:**
```typescript
// CORRECT - From investor-bidding.sh line 395
GET /marketplace/bids/my-bids?assetId=:assetId
```

**Files Changed:**
- ✅ `src/lib/api/marketplace.service.ts` - Updated `getUserBids()` method
- ✅ `src/stores/marketplace.store.ts` - Updated signature to `fetchUserBids(assetId?)`
- ✅ `src/pages/portfolio/Portfolio.page.tsx` - Removed address param, uses JWT auth

---

### 2. ❌ **FIXED:** Wrong endAuction Endpoint

**Problem:**
```typescript
// WRONG
POST /marketplace/end-auction/:auctionId
```

**Solution:**
```typescript
// CORRECT - From admin-endauction.sh line 260
POST /admin/compliance/end-auction
{
  assetId: string,
  clearingPrice: string, // wei (6 decimals)
  transactionHash: string
}
```

**Files Changed:**
- ✅ `src/lib/api/marketplace.service.ts` - Updated `endAuction()` signature and endpoint

---

### 3. ✅ **ADDED:** Missing notifyBidPlaced Endpoint

**Added:**
```typescript
POST /marketplace/bids/notify
{
  txHash: string,
  assetId: string,
  tokenAmount: string, // wei (18 decimals)
  price: string,       // wei (6 decimals)
  blockNumber: string
}
```

**Source:** investor-bidding.sh line 362
**Purpose:** Called AFTER successful on-chain bid submission

**Files Changed:**
- ✅ `src/lib/api/marketplace.service.ts` - Added `notifyBidPlaced()` method

---

### 4. ✅ **ADDED:** Missing notifyBidSettled Endpoint

**Added:**
```typescript
POST /marketplace/bids/settle-notify
{
  assetId: string,
  bidIndex: number,
  txHash: string,
  blockNumber: string
}
```

**Source:** investor-settle.sh line 264
**Purpose:** Called AFTER successful on-chain bid settlement

**Files Changed:**
- ✅ `src/lib/api/marketplace.service.ts` - Added `notifyBidSettled()` method

---

### 5. ✅ **ADDED:** Missing getAuctionBids Endpoint

**Added:**
```typescript
GET /marketplace/auctions/:assetId/bids

Response: {
  bids: Bid[],
  pricePoints: PricePoint[]
}
```

**Source:** investor-bidding.sh line 403, admin-endauction.sh line 282
**Purpose:** View all bids for an auction (admin + investor)

**Files Changed:**
- ✅ `src/lib/api/marketplace.service.ts` - Added `getAuctionBids()` method

---

## ⚠️ UNVERIFIED Endpoints (May Not Exist)

These endpoints are used in the frontend but **NOT found** in test scripts:

### 1. `GET /marketplace/auctions?status=BIDDING`

**Status:** ⚠️ **NOT VERIFIED**
**Used By:** Marketplace.page.tsx line 51
**Purpose:** List all auctions by status
**Alternative:** Use `/announcements?type=AUCTION_LIVE&status=ACTIVE` (from admin-approve.sh)

**Recommendation:**
```typescript
// Backend should add this endpoint
GET /marketplace/auctions?status=BIDDING|ENDED|SETTLED

Response: {
  success: boolean,
  count: number,
  auctions: Auction[]
}
```

---

### 2. `GET /marketplace/auctions/:auctionId`

**Status:** ⚠️ **NOT VERIFIED**
**Used By:** AuctionDetail.page.tsx (would be used)
**Purpose:** Get single auction details
**Alternative:** Use `/assets/:assetId` or `/marketplace/listings/:assetId`

**Recommendation:**
```typescript
// Backend should add this endpoint
GET /marketplace/auctions/:auctionId

Response: {
  success: boolean,
  auction: Auction
}
```

---

### 3. `POST /marketplace/create-auction`

**Status:** ⚠️ **NOT VERIFIED**
**Used By:** Admin AuctionManagement.page.tsx (would be used)
**Purpose:** Create new auction (admin only)
**Alternative:** Auction creation happens via admin-approve.sh workflow:
1. POST `/admin/compliance/approve`
2. POST `/admin/assets/:assetId/register`
3. POST `/admin/assets/deploy-token`
4. POST `/admin/compliance/schedule-auction`

**Recommendation:** Keep using the 4-step workflow from admin-approve.sh

---

## 📋 Frontend Integration Status

### Marketplace Page
- ✅ Fetches active auctions: `getAuctions('BIDDING')` - ⚠️ UNVERIFIED endpoint
- ✅ Displays auction advertising strip
- ✅ Shows "Active Auctions" card (replaced Featured Issuances)

### Portfolio Page
- ✅ Fetches user bids: `getUserBids()` - **CORRECTED** to `/marketplace/bids/my-bids`
- ✅ Displays "My Bids" section with status badges
- ✅ Shows "Claim Tokens" button for successful bids

### Admin Dashboard
- ✅ Uses verified admin endpoints from scripts
- ⚠️ Auction management uses `getAuctions()` - UNVERIFIED endpoint

---

## 🎯 Recommendations for Backend Team

### High Priority (Required for MVP)

1. **Add GET /marketplace/auctions endpoint**
   - Filter by status (BIDDING, ENDED, SETTLED)
   - Returns list of auctions with metadata
   - Used by marketplace page and admin dashboard

2. **Add GET /marketplace/auctions/:auctionId endpoint**
   - Returns single auction details
   - Used by auction detail page

### Medium Priority (Nice to Have)

3. **Add GET /portfolio endpoint**
   - Consolidate holdings + bids in one call
   - Reduces frontend API calls

4. **Add GET /admin/assets?status=COMPLIANCE_APPROVED**
   - Already exists according to admin.service.ts
   - Verify it supports status filtering

---

## 🔄 Contract vs API Call Separation

### On-Chain Calls (NOT Backend APIs)

These are **contract interactions** via wagmi/ethers:

1. **IdentityRegistry.isVerified(address)** - Check KYC status
2. **IdentityRegistry.registerIdentity(address)** - Register KYC (admin only)
3. **USDC.approve(marketplace, amount)** - Approve USDC spending
4. **PrimaryMarketplace.submitBid(assetIdBytes32, tokenAmountWei, priceWei)** - Place bid
5. **PrimaryMarketplace.settleBid(assetIdBytes32, bidIndex)** - Settle/claim bid
6. **PrimaryMarketplace.endAuction(assetIdBytes32, clearingPriceWei)** - End auction (admin)

### Backend Notification APIs

Called **AFTER** successful on-chain transactions:

1. **POST /marketplace/bids/notify** - After submitBid()
2. **POST /marketplace/bids/settle-notify** - After settleBid()
3. **POST /admin/compliance/end-auction** - After endAuction()

---

## 📊 Summary Statistics

- **Verified Endpoints:** 14
- **Fixed Issues:** 5
- **Unverified Endpoints:** 3
- **Scripts Analyzed:** 6
- **Files Modified:** 3

---

## ✅ All Issues Resolved

All API mismatches have been corrected. The frontend now:
1. Uses correct backend endpoints from scripts
2. Clearly marks unverified endpoints with warnings
3. Separates contract calls from backend APIs
4. Includes proper notification flows

**Next Step:** Backend team should implement the 3 unverified endpoints for full functionality.
