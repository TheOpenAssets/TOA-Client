# Dutch Auction Flow Analysis - Script vs Frontend Mapping

**Date:** 2025-12-26
**Purpose:** Map 100% script-verified endpoints to frontend UI requirements

---

## 📊 COMPLETE USER FLOW (From Scripts)

### Phase 0: Asset Upload
**Script:** `upload-auction-asset.sh`
**Actor:** Originator (Issuer)

```
Flow:
1. Originator authenticates
2. POST /assets/upload (invoice PDF + metadata)
   ← Response: { assetId, priceRange: { min, max } }
3. Asset status: UPLOADED
```

**Frontend:** ❌ NOT IMPLEMENTED (Real upload via Typeform webhook)

---

### Phase 1: Admin Approval & Scheduling
**Script:** `admin-approve.sh`
**Actor:** Admin

```
Flow:
1. Admin authenticates
   GET /auth/challenge?walletAddress=X&role=ADMIN
   POST /auth/login

2. View pending asset
   GET /assets/:assetId
   ← Response: { status, metadata, etc }

3. Approve asset
   POST /admin/compliance/approve
   Body: { assetId, adminWallet }
   ← Response: { success, status: "COMPLIANCE_APPROVED" }

4. Register on-chain (attestation)
   POST /admin/assets/:assetId/register
   ← ON-CHAIN: AssetRegistry.registerAsset()
   ← Response: { success, transactionHash }

5. Deploy RWA token
   POST /admin/assets/deploy-token
   Body: { assetId, name, symbol }
   ← ON-CHAIN: RWATokenFactory.deployToken()
   ← Response: { success, tokenAddress, transactionHash }

6. Schedule auction start
   POST /admin/compliance/schedule-auction
   Body: { assetId, startDelayMinutes }
   ← Response: { success, scheduledStartTime }

   [BACKEND JOB - At Scheduled Time]
   → Creates on-chain listing: PrimaryMarketplace.createListing()
   → Updates DB: listing.active = true
   → Creates announcement: type=AUCTION_LIVE

   [BACKEND JOB - 1 Minute After Start]
   → Verifies listing is live
   → If success: Keep AUCTION_LIVE announcement
   → If failed: Create AUCTION_FAILED announcement

7. Verify announcement created
   GET /announcements/asset/:assetId
   ← Response: [{ type: "AUCTION_LIVE", title, message, ... }]
```

**Verified Endpoints:**
- ✅ Line 100: `GET /auth/challenge`
- ✅ Line 139: `POST /auth/login`
- ✅ Line 168: `GET /assets/:assetId`
- ✅ Line 211: `POST /admin/compliance/approve`
- ✅ Line 237: `POST /admin/assets/:assetId/register`
- ✅ Line 280: `POST /admin/assets/deploy-token`
- ✅ Line 326: `POST /admin/compliance/schedule-auction`
- ✅ Line 353: `GET /announcements/asset/:assetId`
- ✅ Line 400: `GET /announcements?type=AUCTION_LIVE&status=ACTIVE`

**Frontend:** ✅ IMPLEMENTED in Admin Dashboard

---

### Phase 2: Investor Bidding
**Script:** `investror-bidding.sh`
**Actor:** Investor

```
Flow:
1. Investor authenticates
   GET /auth/challenge?walletAddress=X&role=INVESTOR
   POST /auth/login
   ← Response: { tokens: { access, refresh } }

2. Check KYC registration (ON-CHAIN)
   IdentityRegistry.isVerified(investorAddress)
   If not verified:
     → IdentityRegistry.registerIdentity() [Admin only]

3. Get auction details
   [Need to determine source - see below]

4. Approve USDC (ON-CHAIN)
   USDC.approve(marketplaceAddress, depositAmount)

5. Submit bid (ON-CHAIN)
   PrimaryMarketplace.submitBid(assetIdBytes32, tokenAmountWei, priceWei)
   ← TX Hash, Block Number

6. Notify backend
   POST /marketplace/bids/notify
   Body: {
     txHash,
     assetId,
     tokenAmount: "wei string",
     price: "wei string",
     blockNumber: "string"
   }
   ← Response: { success, bidId }

7. Verify bid recorded
   GET /marketplace/bids/my-bids?assetId=X
   ← Response: { bids: [{ bidId, tokensRequested, maxPrice, status, ... }] }

8. View all auction bids
   GET /marketplace/auctions/:assetId/bids
   ← Response: {
       bids: [...],
       pricePoints: [{ price, totalTokens, bidCount }]
     }
```

**Verified Endpoints:**
- ✅ Line 154: `GET /auth/challenge`
- ✅ Line 169: `POST /auth/login`
- ✅ Line 362: `POST /marketplace/bids/notify`
- ✅ Line 395: `GET /marketplace/bids/my-bids?assetId=X`
- ✅ Line 403: `GET /marketplace/auctions/:assetId/bids`

**Frontend:** ✅ IMPLEMENTED in Marketplace + Portfolio

---

### Phase 3: Admin Ends Auction
**Script:** `admin-endauction.sh`
**Actor:** Admin

```
Flow:
1. Admin authenticates
   GET /auth/challenge?walletAddress=X&role=ADMIN
   POST /auth/login

2. End auction (ON-CHAIN)
   PrimaryMarketplace.endAuction(assetIdBytes32, clearingPriceWei)
   ← TX Hash, Block Number

3. Notify backend
   POST /admin/compliance/end-auction
   Body: {
     assetId,
     clearingPrice: "wei string",
     transactionHash
   }
   ← Response: { success }
   [Backend creates AUCTION_ENDED announcement]

4. View auction results
   GET /marketplace/auctions/:assetId/bids
   ← Response: {
       bids: [{ bidder, tokenAmount, price, status }],
       pricePoints: [{ price, totalTokens, bidCount }]
     }
```

**Verified Endpoints:**
- ✅ Line 100: `GET /auth/challenge`
- ✅ Line 139: `POST /auth/login`
- ✅ Line 260: `POST /admin/compliance/end-auction`
- ✅ Line 282: `GET /marketplace/auctions/:assetId/bids`

**Frontend:** ✅ IMPLEMENTED in Admin Dashboard

---

### Phase 4: Settlement
**Script:** `investor-settle.sh`
**Actor:** Investor

```
Flow:
1. Investor authenticates
   GET /auth/challenge?walletAddress=X&role=INVESTOR
   POST /auth/login

2. Settle bid (ON-CHAIN)
   PrimaryMarketplace.settleBid(assetIdBytes32, bidIndex)
   ← Automatic token transfer + refund
   ← TX Hash, Block Number

3. Notify backend
   POST /marketplace/bids/settle-notify
   Body: {
     assetId,
     bidIndex,
     txHash,
     blockNumber
   }
   ← Response: {
       success,
       status: "SUCCESSFUL|FAILED",
       tokensReceived: "wei string",
       refundAmount: "wei string"
     }
```

**Verified Endpoints:**
- ✅ Line 100: `GET /auth/challenge`
- ✅ Line 139: `POST /auth/login`
- ✅ Line 264: `POST /marketplace/bids/settle-notify`

**Frontend:** ⚠️ PARTIAL - Claim button exists but needs contract integration

---

## 🎯 FRONTEND UI REQUIREMENTS vs VERIFIED ENDPOINTS

### 1. Marketplace Page - "Active Auctions" Card

**UI Needs:**
- List of active auctions
- For each auction: assetId, totalSupply, reservePrice, endTime, totalBids

**❓ QUESTION: How to get this data?**

**Option A: Use Announcements (VERIFIED)**
```typescript
GET /announcements?type=AUCTION_LIVE&status=ACTIVE
← Response: [{
  id,
  type: "AUCTION_LIVE",
  assetId,
  title,
  message,
  status: "ACTIVE",
  createdAt
}]

// Then for each announcement, fetch asset details:
GET /assets/:assetId
← Response: {
  assetId,
  metadata: { ... },
  token: { address, totalSupply },
  listing: { reservePrice, endTime, ... }
}
```

**Option B: Create new endpoint (NOT VERIFIED)**
```typescript
GET /marketplace/auctions?status=BIDDING
← Would need backend to implement this
```

**✅ RECOMMENDATION:** Use Option A (announcements) since it's VERIFIED in script

---

### 2. Marketplace Page - Auction Advertising Strip

**UI Needs:**
- Scrolling list of active auctions
- Quick preview: assetId, time remaining

**✅ SOLUTION:** Same as above - use announcements endpoint

---

### 3. Auction Detail Page

**UI Needs:**
- Full auction details: totalSupply, reservePrice, endTime, metadata
- Bid form: token amount, max price
- Bid submission flow

**❓ QUESTION: How to get single auction details?**

**Option A: Use Assets Endpoint (VERIFIED)**
```typescript
GET /assets/:assetId
← Response: { assetId, metadata, token, listing }
```

**Option B: Use Announcements + Assets (VERIFIED)**
```typescript
GET /announcements/asset/:assetId
← Get announcement (verify auction is live)

GET /assets/:assetId
← Get full asset/listing details
```

**✅ RECOMMENDATION:** Use Option A - `GET /assets/:assetId` directly

---

### 4. Portfolio Page - "My Bids" Section

**UI Needs:**
- List of user's bids across all auctions
- For each bid: auctionId, tokensRequested, maxPrice, status

**✅ SOLUTION (VERIFIED):**
```typescript
GET /marketplace/bids/my-bids
← Response: { bids: [...] }
```

**✅ ALREADY IMPLEMENTED CORRECTLY**

---

### 5. Admin Dashboard - Auction Management

**UI Needs:**
- List all auctions (active, ended, settled)
- For each auction: status, total bids, results

**✅ SOLUTION (VERIFIED):**
```typescript
// Active auctions
GET /announcements?type=AUCTION_LIVE&status=ACTIVE

// Ended auctions
GET /announcements?type=AUCTION_ENDED

// For each auction, view bids:
GET /marketplace/auctions/:assetId/bids
```

---

## 🚨 CRITICAL FINDINGS

### ❌ REMOVE These Unverified Endpoints:

1. **`GET /marketplace/auctions?status=X`**
   - NOT in scripts
   - Replace with: `GET /announcements?type=AUCTION_LIVE&status=ACTIVE`

2. **`GET /marketplace/auctions/:auctionId`**
   - NOT in scripts
   - Replace with: `GET /assets/:assetId`

3. **`POST /marketplace/create-auction`**
   - NOT in scripts
   - Use existing workflow: approve → register → deploy → schedule

---

## ✅ VERIFIED ENDPOINT MAPPING

### Auth
- `GET /auth/challenge?walletAddress=X&role=Y`
- `POST /auth/login`

### Assets
- `GET /assets/:assetId` - Get asset/auction details

### Announcements
- `GET /announcements?type=AUCTION_LIVE&status=ACTIVE` - List active auctions
- `GET /announcements/asset/:assetId` - Get announcements for asset

### Bids
- `POST /marketplace/bids/notify` - Notify after bid submission
- `GET /marketplace/bids/my-bids?assetId=X` - Get user's bids
- `GET /marketplace/auctions/:assetId/bids` - Get all auction bids
- `POST /marketplace/bids/settle-notify` - Notify after settlement

### Admin
- `POST /admin/compliance/approve`
- `POST /admin/assets/:assetId/register`
- `POST /admin/assets/deploy-token`
- `POST /admin/compliance/schedule-auction`
- `POST /admin/compliance/end-auction`

---

## 🎯 FINAL INTEGRATION PLAN

### Step 1: Remove Unverified Endpoints
- ❌ Remove `getAuctions(status)` from marketplace.service.ts
- ❌ Remove `getAuctionById(id)` from marketplace.service.ts
- ❌ Remove `createAuction()` from marketplace.service.ts

### Step 2: Add Verified Alternatives
- ✅ Add `getActiveAuctionAnnouncements()` → Uses `/announcements?type=AUCTION_LIVE&status=ACTIVE`
- ✅ Add `getAssetById(assetId)` → Uses `/assets/:assetId` (if not already exists)

### Step 3: Update Pages
- ✅ Marketplace.page.tsx → Use announcements endpoint
- ✅ Portfolio.page.tsx → Already correct
- ✅ Admin pages → Use announcements for listing auctions

---

## ❓ QUESTIONS FOR USER

**Before proceeding with final integration, I need confirmation:**

1. **For showing active auctions on Marketplace page:**
   - Use `GET /announcements?type=AUCTION_LIVE&status=ACTIVE` to get list
   - Then fetch each asset details via `GET /assets/:assetId`
   - Is this acceptable, or do you prefer backend to create a dedicated auction list endpoint?

2. **For auction detail page:**
   - Use `GET /assets/:assetId` to get all auction info
   - Is this endpoint returning listing data (reservePrice, endTime, totalSupply)?

3. **Current asset/listing structure:**
   - What does `GET /assets/:assetId` currently return?
   - Does it include listing information for auctions?

**Please confirm and I'll proceed with 100% script-aligned integration.**
