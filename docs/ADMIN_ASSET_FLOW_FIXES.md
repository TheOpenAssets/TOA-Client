# 🔧 Admin Asset Flow - Critical Issues & Fixes

**Date:** 2025-12-26
**Status:** IDENTIFIED & FIXING

---

## 🚨 Critical Issues Found

### Issue #1: Asset Filtering Logic is CORRECT but Backend Status is INCONSISTENT

**Analysis of API Response:**

| Asset ID | Status Field | Checkpoints | Token Object | Should Show In |
|---------|--------------|-------------|--------------|----------------|
| `4105fe0d` | `ATTESTED` | attested ✅ | NO | Step 1: Register ✅ |
| `9d2dd6af` | `ATTESTED` | attested ✅ | NO | Step 1: Register ✅ |
| `fb518b56` | `MERKLED` | merkled ✅ (no attest) | NO | NOT READY (needs attestation first!) ❌ |
| `0bc81137` | `TOKENIZED` | all ✅ + tokenized | YES | Step 3: List on Marketplace ✅ |
| `9482d1dc` | `TOKENIZED` | all ✅ + tokenized | YES + listed | Already Listed! ✅ |
| `87a17e86` | `TOKENIZED` | all ✅ + tokenized | YES + listed | Already Listed! ✅ |
| `0c0d448a` | `ATTESTED` ❌ | all ✅ + tokenized | YES | **INCONSISTENT!** Should be `TOKENIZED` |
| `ac07543e` | `ATTESTED` | attested ✅ | NO | Step 1: Register ✅ |

**Problem:** Asset `0c0d448a-93f9-4429-8935-70f38148f535` has:
- status: "ATTESTED" (WRONG!)
- checkpoints: `{uploaded: true, hashed: true, merkled: true, attested: true, registered: true, tokenized: true}` (all true)
- token object exists with address
- **Should be status: "TOKENIZED" not "ATTESTED"!**

**Root Cause:**
Backend is NOT updating the `status` field after registration/tokenization. The `checkpoints` are being updated correctly, but the `status` field stays stale.

---

### Issue #2: Assets Showing in Wrong Steps

**Current Filtering (in OperationsView.page.tsx):**
```typescript
// ✅ CORRECT!
const attestedAssets = assetsForOperations.filter(
  (asset) => asset.checkpoints.attested && !asset.checkpoints.registered
);
const registeredAssets = assetsForOperations.filter(
  (asset) => asset.checkpoints.registered && !asset.checkpoints.tokenized
);
const tokenizedAssets = assetsForOperations.filter(
  (asset) => asset.checkpoints.tokenized
);
```

**The filtering logic is CORRECT!** But there's a problem:

**Problem with `tokenizedAssets`:**
This filter includes ALL tokenized assets, even those already listed!

```typescript
// Current (WRONG):
const tokenizedAssets = assetsForOperations.filter(
  (asset) => asset.checkpoints.tokenized
);
// Returns: [asset1(not listed), asset2(already listed), asset3(already listed)]

// Should be (CORRECT):
const tokenizedAssets = assetsForOperations.filter(
  (asset) => asset.checkpoints.tokenized && !asset.listing?.active
);
// Returns: [asset1(not listed)]
```

---

### Issue #3: AUCTION Assets Don't Show Scheduling Modal

**Current Code (line 120-122 in OperationsView.page.tsx):**
```typescript
const handleListOnMarketplace = (asset: AdminAsset) => {
  setSelectedAsset(asset);
  setShowListingModal(true);  // ❌ Always shows same modal
};
```

**Problem:**
- For regular (STATIC) assets: Shows listing modal ✅
- For AUCTION assets: Shows listing modal ❌ (should show auction scheduling modal)

**What Should Happen:**
```typescript
const handleListOnMarketplace = (asset: AdminAsset) => {
  setSelectedAsset(asset);

  // Check asset type
  if (asset.assetType === 'AUCTION' || asset.listing?.type === 'AUCTION') {
    setShowAuctionSchedulingModal(true);  // ✅ Show auction modal
  } else {
    setShowListingModal(true);  // ✅ Show static listing modal
  }
};
```

---

## ✅ Required Fixes

### Fix #1: Filter Out Already-Listed Assets from Step 3

**File:** `src/pages/admin/operations/OperationsView.page.tsx`

**Current Code (line 52-54):**
```typescript
const tokenizedAssets = assetsForOperations.filter(
  (asset) => asset.checkpoints.tokenized
);
```

**Fixed Code:**
```typescript
const tokenizedAssets = assetsForOperations.filter(
  (asset) => asset.checkpoints.tokenized && !asset.listing?.active
);
```

**Impact:**
- Assets that are already listed will NOT show in "Step 3: List on Marketplace"
- Only assets that need to be listed will appear

---

### Fix #2: Add Auction Scheduling Modal for AUCTION Type Assets

**File:** `src/pages/admin/operations/OperationsView.page.tsx`

**Add State:**
```typescript
const [showAuctionSchedulingModal, setShowAuctionSchedulingModal] = useState(false);
const [auctionStartTime, setAuctionStartTime] = useState('');
const [auctionDuration, setAuctionDuration] = useState('900'); // 15 minutes default
```

**Update Handler:**
```typescript
const handleListOnMarketplace = (asset: AdminAsset) => {
  setSelectedAsset(asset);

  // Check if asset is AUCTION type
  if (asset.assetType === 'AUCTION' || asset.listing?.type === 'AUCTION') {
    console.log('🔨 Opening auction scheduling modal for:', asset.assetId);
    setShowAuctionSchedulingModal(true);
  } else {
    console.log('📋 Opening static listing modal for:', asset.assetId);
    setShowListingModal(true);
  }
};
```

**Add Auction Confirmation:**
```typescript
const confirmAuctionScheduling = async () => {
  if (!selectedAsset) return;
  setProcessing(true);

  try {
    // Call API to schedule auction
    await adminService.listOnMarketplace(
      selectedAsset.assetId,
      'AUCTION',  // type
      selectedAsset.listing.reservePrice || '800000',  // reserve price
      selectedAsset.tokenParams.minInvestment || '1000000000000000000000',  // min investment
      auctionDuration  // duration in seconds
    );

    console.log('✅ Auction scheduled successfully');
    fetchAdminDashboardData();
    setShowAuctionSchedulingModal(false);
    setSelectedAsset(null);
    alert('Auction scheduled successfully!');
  } catch (error: any) {
    console.error('❌ Failed to schedule auction:', error);
    alert(`Failed to schedule auction: ${error.message || 'Unknown error'}`);
  } finally {
    setProcessing(false);
  }
};
```

---

### Fix #3: Add Visual Indicator for Asset Types

**File:** `src/pages/admin/operations/OperationsView.page.tsx`

**In the asset cards (Step 3), add type badge:**
```typescript
<div className="flex items-center gap-2">
  <p className="font-geist text-lg font-normal text-foreground">
    {asset.metadata.invoiceNumber}
  </p>
  {asset.assetType === 'AUCTION' && (
    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
      🔨 AUCTION
    </span>
  )}
  {asset.listing?.type === 'STATIC' && (
    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
      📊 STATIC
    </span>
  )}
</div>
```

---

### Fix #4: Backend Status Update (CRITICAL!)

**Issue:** Backend doesn't update `status` field after registration/tokenization

**Required Backend Fix:**
```javascript
// After successful registration:
await Asset.updateOne(
  { assetId },
  {
    status: 'REGISTERED',  // ✅ Update status!
    'checkpoints.registered': true,
    'registry.blockNumber': blockNumber,
    // ... other registry data
  }
);

// After successful tokenization:
await Asset.updateOne(
  { assetId },
  {
    status: 'TOKENIZED',  // ✅ Update status!
    'checkpoints.tokenized': true,
    'token.address': tokenAddress,
    // ... other token data
  }
);
```

---

## 🎯 Expected Behavior After Fixes

### Step 1: Register on Mantle
**Should Show:**
- Assets with `checkpoints.attested === true`
- AND `checkpoints.registered !== true`
- Status: "ATTESTED" or "MERKLED"

**Examples from your data:**
- ✅ `4105fe0d-5eca-41b6-a51e-cf0e1299e8d7` (ATTESTED, not registered)
- ✅ `9d2dd6af-c0da-4e5e-a59d-bf41e7630932` (ATTESTED, not registered)
- ✅ `ac07543e-ed86-40ce-a2ad-3974bb921727` (ATTESTED, not registered)
- ❌ `fb518b56-863e-4e78-b01d-d5cbcfcdaded` (MERKLED, not attested - needs compliance first!)

---

### Step 2: Deploy Token
**Should Show:**
- Assets with `checkpoints.registered === true`
- AND `checkpoints.tokenized !== true`
- Status: "REGISTERED"

**Examples:** (None in your current data - all registered assets are already tokenized)

---

### Step 3: List on Marketplace
**Should Show:**
- Assets with `checkpoints.tokenized === true`
- AND `listing.active !== true` (NOT already listed)
- Status: "TOKENIZED"

**Examples from your data:**
- ✅ `0bc81137-0775-4f88-be5b-19ba2acec194` (TOKENIZED, not listed)
- ❌ `9482d1dc-b852-417f-ab7e-f8a1cdd44057` (already listed - listing.active = true)
- ❌ `87a17e86-d381-4f1b-8555-44acd5a84664` (already listed - listing.active = true)
- ✅ `0c0d448a-93f9-4429-8935-70f38148f535` (TOKENIZED, but status shows ATTESTED - backend bug!)

---

### Clicking "List on Marketplace" Button:

**For STATIC Assets:**
```
→ Opens regular listing modal
→ Admin fills: type=STATIC, price, minInvestment
→ Calls: POST /admin/assets/list-on-marketplace
→ Asset listed immediately
```

**For AUCTION Assets:**
```
→ Opens auction scheduling modal
→ Admin fills: start time, duration (reserve price pre-filled from asset)
→ Calls: POST /admin/assets/list-on-marketplace with type=AUCTION
→ Auction scheduled
→ At start time: Backend activates auction + creates AUCTION_LIVE announcement
```

---

## 📋 Implementation Checklist

Frontend:
- [ ] Filter out already-listed assets from Step 3
- [ ] Add `showAuctionSchedulingModal` state
- [ ] Update `handleListOnMarketplace` to detect AUCTION assets
- [ ] Create auction scheduling modal UI
- [ ] Add auction confirmation handler
- [ ] Add asset type badges in Step 3

Backend (needs verification):
- [ ] Verify status field is updated after registration
- [ ] Verify status field is updated after tokenization
- [ ] Verify auction scheduling endpoint works correctly

Testing:
- [ ] Step 1 shows only attested assets (not registered)
- [ ] Step 2 shows only registered assets (not tokenized)
- [ ] Step 3 shows only tokenized assets (not listed)
- [ ] AUCTION assets open scheduling modal
- [ ] STATIC assets open regular listing modal
- [ ] Asset moves between steps after each operation

---

## 🚀 Priority

1. **CRITICAL:** Filter out already-listed assets from Step 3 (Fix #1)
2. **HIGH:** Add auction scheduling modal (Fix #2 & #3)
3. **MEDIUM:** Backend status update verification (Fix #4 - backend team)

The frontend filtering logic is already CORRECT. We just need to:
1. Exclude already-listed assets
2. Add proper modal selection based on asset type
