# Admin Dashboard Integration - Real API Implementation

## Overview

The admin dashboard is now fully integrated with the backend API to fetch and manage real assets. All mock data has been replaced with actual API calls.

## Asset Lifecycle Flow

The admin manages assets through the following lifecycle stages:

```
UPLOADED → ATTESTED → REGISTERED → TOKENIZED → LISTED
   ↓          ↓           ↓            ↓          ↓
Compliance  Operations  Operations  Marketplace  Active
  Queue       Tab         Tab          Ready    Investors
```

### Stage Details

1. **UPLOADED** - Asset submitted by issuer, waiting for compliance review
2. **ATTESTED** - Compliance approved, ready for on-chain registration
3. **REGISTERED** - Registered on blockchain, ready for tokenization
4. **TOKENIZED** - ERC-20 token deployed, ready for marketplace listing
5. **LISTED** - Live on marketplace, available for investors

## API Integration

### Base Endpoint
```
GET /admin/assets
```

### Filtering Options

#### 1. Get All Assets
```bash
curl -X GET 'http://localhost:3000/admin/assets' \
  --header 'Authorization: Bearer <admin_access_token>'
```

#### 2. Get Assets by Status
```bash
# Pending compliance approval
curl -X GET 'http://localhost:3000/admin/assets?status=UPLOADED'

# Ready for registration
curl -X GET 'http://localhost:3000/admin/assets?status=ATTESTED'

# Ready for tokenization
curl -X GET 'http://localhost:3000/admin/assets?status=REGISTERED'

# Ready for marketplace listing
curl -X GET 'http://localhost:3000/admin/assets?status=TOKENIZED'
```

#### 3. Get Assets Needing Attention
```bash
curl -X GET 'http://localhost:3000/admin/assets?needsAttention=true' \
  --header 'Authorization: Bearer <admin_access_token>'
```

#### 4. Filter by Originator
```bash
curl -X GET 'http://localhost:3000/admin/assets?originator=0x23e67597f0898f747Fa3291C8920168adF9455D0' \
  --header 'Authorization: Bearer <admin_access_token>'
```

#### 5. Pagination
```bash
curl -X GET 'http://localhost:3000/admin/assets?page=2&limit=20' \
  --header 'Authorization: Bearer <admin_access_token>'
```

### Response Format
```json
{
  "assets": [
    {
      "id": "9482d1dc-b852-417f-ab7e-f8a1cdd44057",
      "name": "Tech Invoice RWA Token",
      "status": "UPLOADED",
      "invoiceNumber": "INV-2025-637514",
      "originator": "0x23e67597f0898f747Fa3291C8920168adF9455D0",
      "createdAt": "2025-12-24T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

## Frontend Implementation

### Admin Service Methods

#### `getAllAssets(params?)`
Fetches assets with optional filtering:
```typescript
const { assets, pagination } = await adminService.getAllAssets({
  status: 'UPLOADED',
  needsAttention: true,
  page: 1,
  limit: 50
});
```

#### `getAssetsForCompliance()`
Gets assets needing compliance approval (status: UPLOADED):
```typescript
const assets = await adminService.getAssetsForCompliance();
// Returns assets with status='UPLOADED'
```

#### `getAssetsForOperations()`
Gets assets ready for on-chain operations (status: ATTESTED or REGISTERED):
```typescript
const assets = await adminService.getAssetsForOperations();
// Returns ATTESTED assets (ready to register) + REGISTERED assets (ready to tokenize)
```

#### `getAssetsForSettlement()`
Gets tokenized assets ready for settlement tracking (status: TOKENIZED):
```typescript
const assets = await adminService.getAssetsForSettlement();
// Returns assets with status='TOKENIZED'
```

### Admin Actions

#### 1. Approve Asset (Compliance)
```typescript
await adminService.approveAsset(assetId, adminWallet);
// POST /admin/compliance/approve
// Changes status: UPLOADED → ATTESTED
```

#### 2. Register Asset On-Chain (Operations)
```typescript
await adminService.registerAsset(assetId);
// POST /admin/assets/:assetId/register
// Changes status: ATTESTED → REGISTERED
```

#### 3. Deploy Token (Operations)
```typescript
await adminService.deployToken(assetId, 'Token Name', 'SYMBOL');
// POST /admin/assets/deploy-token
// Changes status: REGISTERED → TOKENIZED
```

#### 4. List on Marketplace (Operations)
```typescript
await adminService.listOnMarketplace(
  assetId,
  'STATIC',           // listing type
  '1000000',          // price (1 USDC in 6 decimals)
  '1000000000000000000000',  // min investment (1000 tokens in 18 decimals)
  '0'                 // duration
);
// POST /admin/assets/list-on-marketplace
// Changes status: TOKENIZED → LISTED
```

### Admin Store

The `useAdminStore()` provides centralized state management:

```typescript
const {
  assetsForCompliance,   // UPLOADED assets
  assetsForOperations,   // ATTESTED + REGISTERED assets
  assetsForSettlement,   // TOKENIZED assets
  stats,                 // Dashboard statistics
  activities,            // Recent activities
  isLoading,
  error,
  fetchAdminDashboardData
} = useAdminStore();
```

## Dashboard Pages

### 1. Admin Overview Page
**Route**: `/admin`

**Data Displayed**:
- Pending Compliance: Count of UPLOADED assets
- Compliance Approved: Count of ATTESTED assets
- On-Chain Assets: Count of REGISTERED + TOKENIZED + LISTED assets
- Recent Activities: Last 10 assets needing attention

**API Calls**:
```typescript
- GET /admin/assets (all)
- GET /admin/assets?status=UPLOADED
- GET /admin/assets?status=ATTESTED
- GET /admin/assets?needsAttention=true&limit=10
```

### 2. Compliance View Page
**Route**: `/admin/compliance`

**Purpose**: Review and approve/reject assets

**Data Displayed**:
- Assets with status = UPLOADED
- Asset details (invoice number, amount, originator)
- KYC verification status
- Risk assessment

**Actions**:
- ✅ Approve → Changes status to ATTESTED
- ❌ Reject → Changes status to REJECTED
- 🔍 Trigger KYC verification

**API Call**: `GET /admin/assets?status=UPLOADED`

### 3. Operations View Page
**Route**: `/admin/operations`

**Purpose**: Execute on-chain operations

**Data Displayed**:
- **ATTESTED Assets**: Ready to register on-chain
- **REGISTERED Assets**: Ready to deploy token

**Actions for ATTESTED**:
- 📝 Register On-Chain → Changes status to REGISTERED

**Actions for REGISTERED**:
- 🪙 Deploy Token → Changes status to TOKENIZED
- 📈 List on Marketplace → Changes status to LISTED

**API Calls**:
```typescript
- GET /admin/assets?status=ATTESTED
- GET /admin/assets?status=REGISTERED
```

### 4. Settlements View Page
**Route**: `/admin/settlements`

**Purpose**: Track and manage settlements

**Data Displayed**:
- Assets with status = TOKENIZED or LISTED
- Settlement schedules
- Yield distribution tracking

**API Call**: `GET /admin/assets?status=TOKENIZED`

## Complete Asset Deployment Workflow

Based on the `deploy-asset.sh` script, here's the complete flow:

### Step 1: Compliance Approval
```bash
POST /admin/compliance/approve
{
  "assetId": "9482d1dc-b852-417f-ab7e-f8a1cdd44057",
  "adminWallet": "0x23e67597f0898f747Fa3291C8920168adF9455D0"
}

Response: { "success": true, "status": "ATTESTED" }
```

### Step 2: On-Chain Registration
```bash
POST /admin/assets/9482d1dc-b852-417f-ab7e-f8a1cdd44057/register

Response: {
  "success": true,
  "transactionHash": "0x498e...",
  "explorerUrl": "https://explorer.sepolia.arbitrum.xyz/tx/0x498e..."
}
```

### Step 3: Sync Status (if needed)
```bash
POST /admin/sync/update-status
{
  "assetId": "9482d1dc-b852-417f-ab7e-f8a1cdd44057",
  "txHash": "0x498e...",
  "status": "REGISTERED"
}
```

### Step 4: Deploy Token
```bash
POST /admin/assets/deploy-token
{
  "assetId": "9482d1dc-b852-417f-ab7e-f8a1cdd44057",
  "name": "Tech Invoice RWA Token",
  "symbol": "TINV"
}

Response: {
  "success": true,
  "tokenAddress": "0xF837236ea7e3c8fFd1250C62F7c00E1C04ec2E4D",
  "complianceAddress": "0x2701412019FDA0d6Abae34882F8278a7E67Fcc1F",
  "transactionHash": "0x2291..."
}
```

### Step 5: List on Marketplace
```bash
POST /admin/assets/list-on-marketplace
{
  "assetId": "9482d1dc-b852-417f-ab7e-f8a1cdd44057",
  "type": "STATIC",
  "price": "1000000",
  "minInvestment": "1000000000000000000000",
  "duration": "0"
}

Response: {
  "success": true,
  "transactionHash": "0x71123...",
  "explorerUrl": "https://explorer.sepolia.arbitrum.xyz/tx/0x71123..."
}
```

## Console Logs for Debugging

The admin service now includes comprehensive console logging:

### API Calls
```
🔍 Fetching admin assets from: http://localhost:3000/admin/assets?status=UPLOADED
✅ Admin assets fetched: { assets: [...], pagination: {...} }
```

### Filtered Results
```
📋 Assets for Compliance: [...]  // UPLOADED
⚙️ Assets for Operations: [...]  // ATTESTED + REGISTERED
💰 Assets for Settlement: [...]  // TOKENIZED
📊 Admin Stats: { pendingCompliance: 5, ... }
🔔 Admin Activities: [...]
```

## Testing the Integration

### 1. Check API Connection
Open browser DevTools Console and navigate to `/admin`:
```
🔍 Fetching admin assets from: http://localhost:3000/admin/assets
✅ Admin assets fetched: {...}
```

### 2. Verify Data Display
- **Admin Overview**: Should show real counts
- **Compliance Tab**: Should display UPLOADED assets
- **Operations Tab**: Should display ATTESTED and REGISTERED assets

### 3. Test Actions
1. Click "Approve" on an asset in Compliance view
2. Check console for API call
3. Verify status changes to ATTESTED
4. Asset moves to Operations tab

## Error Handling

If API calls fail, the service returns empty arrays:
```typescript
try {
  const { assets } = await this.getAllAssets({ status: 'UPLOADED' });
  return assets;
} catch (error) {
  console.error('Error fetching compliance assets:', error);
  return []; // Fallback to empty array
}
```

This prevents the UI from breaking when:
- Backend is offline
- Authentication fails
- Network errors occur

## Summary

**✅ Real API Integration Complete**

The admin dashboard now:
1. ✅ Fetches real assets from backend
2. ✅ Filters by status for each workflow stage
3. ✅ Executes admin actions via API calls
4. ✅ Tracks asset lifecycle from UPLOADED → LISTED
5. ✅ Provides comprehensive console logging
6. ✅ Handles errors gracefully

**No more mock data!** The admin can now:
- See real assets submitted by issuers
- Approve/reject compliance reviews
- Register assets on blockchain
- Deploy RWA tokens
- List on marketplace
- Track the complete asset lifecycle

Check the browser console for detailed logs showing all API interactions!
