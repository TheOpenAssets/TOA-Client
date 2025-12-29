# 🔨 RWA Token Auction System - Complete System Documentation

> **Source of Truth**: This documentation is derived from tested backend scripts and represents the actual working implementation.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Roles & Responsibilities](#roles--responsibilities)
3. [Complete Auction Lifecycle](#complete-auction-lifecycle)
4. [API Reference](#api-reference)
5. [On-Chain Interactions](#on-chain-interactions)
6. [Dashboard Requirements](#dashboard-requirements)
7. [Integration Guide](#integration-guide)

---

## System Overview

The RWA Token Auction System is a **uniform-price sealed-bid auction** for tokenized real-world assets. All winning bidders pay the same clearing price, regardless of their bid price.

### Key Characteristics

- **Auction Type**: Uniform Price (Dutch auction variant)
- **Bid Privacy**: Bids are on-chain but prices are sealed until auction ends
- **Settlement**: User-initiated after auction ends
- **Price Discovery**: Admin sets clearing price based on bid analysis
- **Payment**: USDC (6 decimals)
- **Tokens**: ERC-20 (18 decimals)

---

## Roles & Responsibilities

### 1. Asset Originator / Supplier

**What they do:**
- Submit invoice assets for tokenization via Typeform (production)
- Provide asset metadata (invoice number, face value, buyer, risk tier, etc.)

**APIs they interact with:**
- ❌ **NO direct API access** (Typeform sends data to backend webhook)

**On-chain interactions:**
- ❌ None

---

### 2. Platform Admin

**What they do:**
- Review and approve submitted assets
- Register assets on-chain
- Deploy RWA tokens
- Schedule auction start time
- End auctions by setting clearing price
- Monitor auction status

**APIs they interact with:**
- `GET /assets/:assetId` - View asset details
- `POST /admin/compliance/approve` - Approve asset
- `POST /admin/assets/:assetId/register` - Register on-chain
- `POST /admin/assets/deploy-token` - Deploy ERC-20 token
- `POST /admin/compliance/schedule-auction` - Schedule auction
- `GET /announcements/asset/:assetId` - View announcements
- `GET /announcements?type=AUCTION_LIVE&status=ACTIVE` - View active auctions
- `POST /admin/compliance/end-auction` - End auction
- `GET /marketplace/auctions/:assetId/bids` - View all bids

**On-chain interactions:**
- Call `AssetRegistry.registerAsset()` - Register asset with attestation
- Call `RWATokenFactory.deployToken()` - Deploy ERC-20 token
- Call `PrimaryMarketplace.endAuction()` - End auction with clearing price

---

### 3. Investor

**What they do:**
- Complete KYC verification
- Browse active auctions
- Place bids on auctions
- Settle bids after auction ends (claim tokens or refund)

**APIs they interact with:**
- `GET /auth/challenge` - Get authentication challenge
- `POST /auth/login` - Authenticate with signature
- `GET /marketplace/auctions?status=BIDDING` - Browse active auctions
- `GET /marketplace/auctions/:auctionId` - View auction details
- `POST /marketplace/bids/notify` - Notify backend of bid placement
- `GET /marketplace/bids/my-bids` - View own bids
- `GET /marketplace/auctions/:auctionId/bids` - View all auction bids
- `POST /marketplace/bids/settle-notify` - Notify backend of settlement

**On-chain interactions:**
- Call `IdentityRegistry.isVerified()` - Check KYC status
- Call `IdentityRegistry.registerIdentity()` - Register for KYC (if needed)
- Call `USDC.approve()` - Approve USDC spending
- Call `PrimaryMarketplace.submitBid()` - Submit bid
- Call `PrimaryMarketplace.settleBid()` - Settle bid after auction ends

---

### 4. Backend System (Automated)

**What it does:**
- Process Typeform submissions (asset upload webhook)
- Calculate price ranges for auctions
- Create auction listings on-chain (scheduled job)
- Listen to blockchain events
- Update database from on-chain events
- Create announcements

**Automated Jobs:**
- **Auction Activation Job**: Creates on-chain listing at scheduled time
- **Auction Status Check Job**: Verifies auction went live (1 min after activation)
- **Event Indexer**: Listens to contract events and updates database

---

### 5. Smart Contracts

**Contracts involved:**
- **IdentityRegistry**: KYC verification
- **AssetRegistry**: On-chain asset registration
- **RWATokenFactory**: Deploy ERC-20 tokens
- **PrimaryMarketplace**: Auction listings and bidding
- **USDC (Mock)**: Payment token

---

## Complete Auction Lifecycle

### Phase 0: Asset Upload (Originator → Backend)

**Trigger**: Asset originator submits invoice via Typeform

**What happens:**

1. **Typeform → Backend Webhook** (Production)
   - Typeform submission triggers webhook
   - Backend receives asset data

2. **Testing Alternative** (upload-auction-asset.sh - TEST ONLY)
   - Script: `POST /assets/upload`
   - **⚠️ Frontend does NOT implement this**

**Data sent to backend:**
```json
{
  "invoiceNumber": "INV-AUCTION-12345",
  "faceValue": "100000",
  "currency": "USD",
  "issueDate": "2025-01-01",
  "dueDate": "2025-07-01",
  "buyerName": "Tech Solutions Inc",
  "industry": "Technology",
  "riskTier": "A",
  "assetType": "AUCTION",
  "totalSupply": "100000000000000000000000",
  "minInvestment": "1000000000000000000000",
  "minRaisePercentage": "80",
  "maxRaisePercentage": "95",
  "auctionDuration": "259200"
}
```

**Backend processing:**
- Validates asset data
- Computes document hash & merkle root
- Calculates price range:
  - `minPrice = (faceValue * minRaisePercentage / 100) / totalSupply`
  - `maxPrice = (faceValue * maxRaisePercentage / 100) / totalSupply`
- Creates asset record with status `PENDING`

**Backend response:**
```json
{
  "success": true,
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "assetType": "AUCTION",
  "message": "Asset uploaded successfully",
  "priceRange": {
    "min": "800000",
    "max": "950000",
    "minRaise": "80000000000",
    "maxRaise": "95000000000"
  }
}
```

---

### Phase 1: Admin Approval & Scheduling

**Trigger**: Admin reviews pending assets and approves

#### Step 1: Admin Views Asset

**API Call:**
```
GET /assets/:assetId
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "assetType": "AUCTION",
  "metadata": {
    "invoiceNumber": "INV-AUCTION-12345",
    "faceValue": "100000",
    "currency": "USD",
    "industry": "Technology",
    "riskTier": "A",
    "buyerName": "Tech Solutions Inc",
    "issueDate": "2025-01-01T00:00:00.000Z",
    "dueDate": "2025-07-01T00:00:00.000Z"
  },
  "tokenParams": {
    "totalSupply": "100000000000000000000000",
    "minInvestment": "1000000000000000000000"
  },
  "auctionParams": {
    "minRaisePercentage": 80,
    "maxRaisePercentage": 95,
    "duration": 259200,
    "priceRange": {
      "min": "800000",
      "max": "950000"
    }
  }
}
```

#### Step 2: Admin Approves Asset

**API Call:**
```
POST /admin/compliance/approve
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "adminWallet": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLIANCE_APPROVED",
  "message": "Asset approved successfully"
}
```

**What backend does:**
- Updates asset status to `COMPLIANCE_APPROVED`
- Asset is now ready for on-chain registration

#### Step 3: Register Asset On-Chain

**API Call:**
```
POST /admin/assets/:assetId/register
Authorization: Bearer <admin-token>
```

**Backend → On-Chain:**
```solidity
AssetRegistry.registerAsset(
  bytes32 assetId,
  bytes32 documentHash,
  bytes32 merkleRoot,
  bytes32 attestationHash
)
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0xabc123...",
  "blockNumber": 12345,
  "message": "Asset registered on-chain"
}
```

#### Step 4: Deploy RWA Token

**API Call:**
```
POST /admin/assets/deploy-token
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Auction RWA Token - INV-AUCTION-12345",
  "symbol": "ARWA"
}
```

**Backend → On-Chain:**
```solidity
RWATokenFactory.deployToken(
  string name,
  string symbol,
  uint256 totalSupply,
  bytes32 assetId
)
```

**Response:**
```json
{
  "success": true,
  "tokenAddress": "0xdef456...",
  "transactionHash": "0xghi789...",
  "message": "Token deployed successfully"
}
```

**What backend does:**
- Updates asset status to `TOKENIZED`
- Stores token address

#### Step 5: Schedule Auction

**API Call:**
```
POST /admin/compliance/schedule-auction
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "startDelayMinutes": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auction scheduled successfully",
  "scheduledStartTime": "2025-01-15T10:05:00.000Z",
  "assetId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**What backend does:**
- Creates `AUCTION_SCHEDULED` announcement
- Schedules automated job to create listing at specified time
- Updates asset metadata with auction timing

#### Step 6: Automated Auction Activation (Backend Job)

**Trigger**: Scheduled time reached

**Backend → On-Chain:**
```solidity
PrimaryMarketplace.createListing(
  bytes32 assetId,
  address tokenAddress,
  uint8 listingType,      // 1 = AUCTION
  uint256 reservePrice,   // minPrice from priceRange
  uint256 totalSupply,
  uint256 auctionDuration,
  uint256 minInvestment
)
```

**What backend does:**
- Updates database: `listing.active = true`
- Updates asset status if needed

#### Step 7: Auction Status Verification (Backend Job)

**Trigger**: 1 minute after scheduled activation

**Backend checks:**
- Queries on-chain listing status
- Verifies listing is active

**If successful:**
- Creates `AUCTION_LIVE` announcement
- Updates asset status to `AUCTION_LIVE`

**If failed:**
- Creates `AUCTION_FAILED` announcement with reason
- Admin must investigate

**Frontend can query:**
```
GET /announcements/asset/:assetId
```

---

### Phase 2: Bidding Period (Investors)

**Trigger**: Auction is live (AUCTION_LIVE announcement exists)

#### Step 1: Investor Discovers Auction

**API Call:**
```
GET /marketplace/auctions?status=BIDDING
Authorization: Bearer <investor-token>
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "auctions": [
    {
      "auctionId": "550e8400-e29b-41d4-a716-446655440000",
      "assetId": "550e8400-e29b-41d4-a716-446655440000",
      "totalSupply": 100000,
      "reservePrice": 0.80,
      "status": "BIDDING",
      "startTime": "2025-01-15T10:05:00.000Z",
      "endTime": "2025-01-18T10:05:00.000Z",
      "totalBids": 5,
      "totalDemand": 45000,
      "metadata": {
        "invoiceNumber": "INV-AUCTION-12345",
        "faceValue": "100000",
        "industry": "Technology",
        "riskTier": "A"
      }
    }
  ]
}
```

#### Step 2: View Auction Details

**API Call:**
```
GET /marketplace/auctions/:auctionId
Authorization: Bearer <investor-token>
```

**Response:**
```json
{
  "success": true,
  "auction": {
    "auctionId": "550e8400-e29b-41d4-a716-446655440000",
    "assetId": "550e8400-e29b-41d4-a716-446655440000",
    "totalSupply": 100000,
    "reservePrice": 0.80,
    "status": "BIDDING",
    "startTime": "2025-01-15T10:05:00.000Z",
    "endTime": "2025-01-18T10:05:00.000Z",
    "totalBids": 5,
    "totalDemand": 45000,
    "metadata": {
      "invoiceNumber": "INV-AUCTION-12345",
      "faceValue": "100000",
      "currency": "USD",
      "industry": "Technology",
      "riskTier": "A",
      "buyerName": "Tech Solutions Inc",
      "issueDate": "2025-01-01T00:00:00.000Z",
      "dueDate": "2025-07-01T00:00:00.000Z"
    }
  }
}
```

#### Step 3: KYC Verification (On-Chain Check)

**Before bidding, frontend must verify KYC:**

```javascript
// Check if investor is KYC verified
const isVerified = await IdentityRegistry.isVerified(investorAddress);

if (!isVerified) {
  // Admin must register investor on-chain
  // This is done via admin script or admin dashboard
  await IdentityRegistry.registerIdentity(investorAddress);
}
```

**⚠️ Important**: KYC registration must be done by admin, not investor

#### Step 4: Place Bid (On-Chain + Backend)

**Frontend validations:**
- Wallet connected
- KYC verified (on-chain check)
- Bid price ≥ reserve price
- Token amount ≥ minimum investment
- Sufficient USDC balance

**Step 4a: Approve USDC**

```javascript
const depositNeeded = tokenAmount * maxPrice;
await USDC.approve(marketplaceAddress, depositNeeded);
```

**Step 4b: Submit Bid On-Chain**

```javascript
const assetIdBytes32 = '0x' + assetId.replace(/-/g, '').padEnd(64, '0');
const tokenAmountWei = ethers.parseUnits(tokenAmount, 18);
const priceWei = ethers.parseUnits(maxPrice, 6);

const tx = await PrimaryMarketplace.submitBid(
  assetIdBytes32,
  tokenAmountWei,
  priceWei
);

const receipt = await tx.wait();
```

**Step 4c: Notify Backend**

**API Call:**
```
POST /marketplace/bids/notify
Authorization: Bearer <investor-token>
Content-Type: application/json

{
  "txHash": "0xabc123...",
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "tokenAmount": "10000000000000000000000",
  "price": "950000",
  "blockNumber": "12345"
}
```

**Response:**
```json
{
  "success": true,
  "bidId": "bid-uuid-123",
  "message": "Bid recorded successfully"
}
```

**What backend does:**
- Stores bid in database
- Updates auction total demand
- Increments bid count

#### Step 5: View My Bids

**API Call:**
```
GET /marketplace/bids/my-bids?assetId=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <investor-token>
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "bids": [
    {
      "bidId": "bid-uuid-123",
      "auctionId": "550e8400-e29b-41d4-a716-446655440000",
      "bidder": "0x123...",
      "tokensRequested": 10000,
      "maxPrice": 0.95,
      "status": "PENDING",
      "submittedAt": "2025-01-15T11:00:00.000Z"
    }
  ]
}
```

#### Step 6: View All Auction Bids (Optional)

**API Call:**
```
GET /marketplace/auctions/:auctionId/bids
Authorization: Bearer <investor-token>
```

**Response:**
```json
{
  "success": true,
  "auctionId": "550e8400-e29b-41d4-a716-446655440000",
  "totalBids": 5,
  "bids": [
    {
      "bidId": "bid-uuid-123",
      "bidder": "0x123...",
      "tokensRequested": 10000,
      "maxPrice": 0.95,
      "status": "PENDING",
      "submittedAt": "2025-01-15T11:00:00.000Z"
    }
  ],
  "pricePoints": [
    {
      "price": "0.95",
      "totalTokens": 10000,
      "bidCount": 1
    }
  ]
}
```

---

### Phase 3: Auction End (Admin)

**Trigger**: Auction duration expires or admin decides to end

#### Step 1: Admin Analyzes Bids

Admin retrieves all bids to determine clearing price:

**API Call:**
```
GET /marketplace/auctions/:auctionId/bids
Authorization: Bearer <admin-token>
```

**Admin determines:**
- Clearing price where demand ≥ supply
- Which bids will be filled
- Final token allocation

#### Step 2: End Auction On-Chain

**On-Chain Call:**
```javascript
const assetIdBytes32 = '0x' + assetId.replace(/-/g, '').padEnd(64, '0');
const clearingPriceWei = ethers.parseUnits(clearingPrice, 6);

const tx = await PrimaryMarketplace.endAuction(
  assetIdBytes32,
  clearingPriceWei
);

const receipt = await tx.wait();
```

**What contract does:**
- Sets auction phase to `ENDED`
- Stores clearing price
- Emits `AuctionEnded` event

#### Step 3: Create AUCTION_ENDED Announcement

**API Call:**
```
POST /admin/compliance/end-auction
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "clearingPrice": "900000",
  "transactionHash": "0xabc123..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "AUCTION_ENDED announcement created",
  "clearingPrice": "0.90"
}
```

**What backend does:**
- Creates `AUCTION_ENDED` announcement
- Updates auction status to `ENDED`
- May update bid statuses based on clearing price

---

### Phase 4: Settlement (Investors)

**Trigger**: Auction has ended, investors settle their bids

#### Step 1: View Bid Status

Investors check their bid results:

**API Call:**
```
GET /marketplace/bids/my-bids?assetId=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <investor-token>
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "bids": [
    {
      "bidId": "bid-uuid-123",
      "auctionId": "550e8400-e29b-41d4-a716-446655440000",
      "bidder": "0x123...",
      "tokensRequested": 10000,
      "maxPrice": 0.95,
      "tokensWon": 10000,
      "actualPrice": 0.90,
      "refundAmount": 500,
      "status": "SUCCESSFUL",
      "submittedAt": "2025-01-15T11:00:00.000Z"
    }
  ]
}
```

**Bid statuses:**
- `PENDING`: Auction not ended yet
- `SUCCESSFUL`: Bid won, can claim tokens
- `PARTIALLY_FILLED`: Won fewer tokens than requested
- `FAILED`: Bid lost, full refund available

#### Step 2: Settle Bid On-Chain

**On-Chain Call:**
```javascript
const assetIdBytes32 = '0x' + assetId.replace(/-/g, '').padEnd(64, '0');
const bidIndex = 0; // Investor's bid index

const tx = await PrimaryMarketplace.settleBid(
  assetIdBytes32,
  bidIndex
);

const receipt = await tx.wait();
```

**What contract does:**

**For winning bids:**
- Transfers RWA tokens to investor
- Transfers payment (tokensWon * clearingPrice) to platform
- Refunds excess USDC (deposit - payment) to investor
- Marks bid as settled

**For losing bids:**
- Returns full USDC deposit to investor
- Marks bid as settled

#### Step 3: Notify Backend

**API Call:**
```
POST /marketplace/bids/settle-notify
Authorization: Bearer <investor-token>
Content-Type: application/json

{
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "bidIndex": 0,
  "txHash": "0xdef456...",
  "blockNumber": "12350"
}
```

**Response:**
```json
{
  "success": true,
  "status": "SETTLED",
  "tokensReceived": "10000000000000000000000",
  "refundAmount": "500000",
  "message": "Bid settled successfully"
}
```

**What backend does:**
- Updates bid status to `SETTLED`
- Records settlement transaction
- Updates user portfolio (if applicable)

---

## API Reference

### Authentication APIs

#### Get Challenge
```
GET /auth/challenge?walletAddress=0x...&role=INVESTOR
```

**Response:**
```json
{
  "message": "Sign this message to authenticate: nonce-12345",
  "nonce": "nonce-12345"
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "walletAddress": "0x...",
  "message": "Sign this message to authenticate: nonce-12345",
  "signature": "0xabc..."
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "walletAddress": "0x...",
    "role": "INVESTOR",
    "kyc": "VERIFIED"
  },
  "tokens": {
    "access": "jwt-token...",
    "refresh": "refresh-token..."
  }
}
```

### Asset APIs

#### Get Asset Details
```
GET /assets/:assetId
Authorization: Bearer <token>
```

### Admin APIs

#### Approve Asset
```
POST /admin/compliance/approve
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "assetId": "uuid",
  "adminWallet": "0x..."
}
```

#### Register Asset On-Chain
```
POST /admin/assets/:assetId/register
Authorization: Bearer <admin-token>
```

#### Deploy Token
```
POST /admin/assets/deploy-token
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "assetId": "uuid",
  "name": "Token Name",
  "symbol": "SYMBOL"
}
```

#### Schedule Auction
```
POST /admin/compliance/schedule-auction
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "assetId": "uuid",
  "startDelayMinutes": 5
}
```

#### End Auction
```
POST /admin/compliance/end-auction
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "assetId": "uuid",
  "clearingPrice": "900000",
  "transactionHash": "0x..."
}
```

### Auction APIs

#### Get Active Auctions
```
GET /marketplace/auctions?status=BIDDING
Authorization: Bearer <token>
```

#### Get Auction Details
```
GET /marketplace/auctions/:auctionId
Authorization: Bearer <token>
```

#### Get Auction Bids
```
GET /marketplace/auctions/:auctionId/bids
Authorization: Bearer <token>
```

### Bid APIs

#### Notify Bid Placement
```
POST /marketplace/bids/notify
Authorization: Bearer <investor-token>
Content-Type: application/json

{
  "txHash": "0x...",
  "assetId": "uuid",
  "tokenAmount": "wei-amount",
  "price": "usdc-wei",
  "blockNumber": "12345"
}
```

#### Get My Bids
```
GET /marketplace/bids/my-bids?assetId=uuid
Authorization: Bearer <investor-token>
```

#### Notify Bid Settlement
```
POST /marketplace/bids/settle-notify
Authorization: Bearer <investor-token>
Content-Type: application/json

{
  "assetId": "uuid",
  "bidIndex": 0,
  "txHash": "0x...",
  "blockNumber": "12350"
}
```

### Announcement APIs

#### Get Asset Announcements
```
GET /announcements/asset/:assetId
```

#### Get Announcements by Type
```
GET /announcements?type=AUCTION_LIVE&status=ACTIVE
```

---

## On-Chain Interactions

### Smart Contracts

1. **IdentityRegistry** - KYC verification
2. **AssetRegistry** - Asset registration
3. **RWATokenFactory** - Token deployment
4. **PrimaryMarketplace** - Auction listings and settlement
5. **USDC** - Payment token

### Contract Calls Reference

#### IdentityRegistry

```solidity
// Check if investor is KYC verified
function isVerified(address wallet) external view returns (bool);

// Register investor (admin only)
function registerIdentity(address wallet) external;
```

#### AssetRegistry

```solidity
// Register asset on-chain (admin only)
function registerAsset(
  bytes32 assetId,
  bytes32 documentHash,
  bytes32 merkleRoot,
  bytes32 attestationHash
) external;
```

#### RWATokenFactory

```solidity
// Deploy new RWA token (admin only)
function deployToken(
  string name,
  string symbol,
  uint256 totalSupply,
  bytes32 assetId
) external returns (address);
```

#### PrimaryMarketplace

```solidity
// Create auction listing (admin only)
function createListing(
  bytes32 assetId,
  address tokenAddress,
  uint8 listingType,
  uint256 reservePrice,
  uint256 totalSupply,
  uint256 auctionDuration,
  uint256 minInvestment
) external;

// Submit bid (investor)
function submitBid(
  bytes32 assetId,
  uint256 tokenAmount,
  uint256 price
) external;

// End auction (admin only)
function endAuction(
  bytes32 assetId,
  uint256 clearingPrice
) external;

// Settle bid (investor)
function settleBid(
  bytes32 assetId,
  uint256 bidIndex
) external;

// View listing details
function listings(bytes32 assetId) external view returns (
  address tokenAddress,
  bytes32 assetId,
  uint8 listingType,
  uint256 staticPrice,
  uint256 reservePrice,
  uint256 endTime,
  uint256 clearingPrice,
  uint8 auctionPhase,
  uint256 totalSupply,
  uint256 sold,
  bool active,
  uint256 minInvestment
);
```

#### USDC

```solidity
// Check USDC balance
function balanceOf(address account) external view returns (uint256);

// Approve USDC spending
function approve(address spender, uint256 amount) external returns (bool);

// Check allowance
function allowance(address owner, address spender) external view returns (uint256);
```

### Data Conversions

**Asset ID Conversion:**
```javascript
// UUID to bytes32
const assetIdBytes32 = '0x' + assetId.replace(/-/g, '').padEnd(64, '0');
```

**Token Amount (18 decimals):**
```javascript
const tokenAmountWei = ethers.parseUnits(tokenAmount, 18);
```

**USDC Price (6 decimals):**
```javascript
const priceWei = ethers.parseUnits(price, 6);
```

---

## Dashboard Requirements

### Admin Dashboard

**Required Sections:**

1. **Pending Assets**
   - List all assets with status `PENDING`
   - Show asset details (invoice number, face value, risk tier)
   - **Action**: Approve button

2. **Approved Assets**
   - List assets with status `COMPLIANCE_APPROVED`
   - **Action**: Register on-chain button

3. **Registered Assets**
   - List assets with tokens deployed
   - **Action**: Schedule auction button

4. **Active Auctions**
   - List all auctions with status `BIDDING`
   - Show auction stats (total bids, total demand, time remaining)
   - **Action**: End auction button

5. **Ended Auctions**
   - List auctions with status `ENDED`
   - Show results (clearing price, total bids, tokens allocated)

**Required APIs:**
- ✅ `GET /assets/:assetId` (exists)
- ✅ `POST /admin/compliance/approve` (exists)
- ✅ `POST /admin/assets/:assetId/register` (exists)
- ✅ `POST /admin/assets/deploy-token` (exists)
- ✅ `POST /admin/compliance/schedule-auction` (exists)
- ✅ `GET /marketplace/auctions?status=BIDDING` (exists)
- ✅ `POST /admin/compliance/end-auction` (exists)
- ❓ **MISSING**: `GET /admin/assets?status=PENDING` - List all assets by status
- ❓ **MISSING**: `GET /marketplace/auctions?status=ENDED` - List ended auctions

### Investor Dashboard (Marketplace)

**Required Sections:**

1. **Active Auctions**
   - Browse auctions with status `BIDDING`
   - Filter by industry, risk tier
   - Show auction details
   - **Action**: View auction → Place bid

2. **My Bids**
   - Show all investor's bids
   - Group by auction
   - Show bid status
   - **Action**: Settle bid (if auction ended)

3. **My Portfolio**
   - Show settled bids
   - Show tokens received
   - Show total refunds

**Required APIs:**
- ✅ `GET /marketplace/auctions?status=BIDDING` (exists)
- ✅ `GET /marketplace/auctions/:auctionId` (exists)
- ✅ `POST /marketplace/bids/notify` (exists)
- ✅ `GET /marketplace/bids/my-bids` (exists)
- ✅ `POST /marketplace/bids/settle-notify` (exists)
- ❓ **MISSING**: `GET /portfolio` - Get investor's portfolio with settled bids

---

## Integration Guide

### Frontend Integration Steps

#### 1. Authentication Flow

```javascript
// Step 1: Get challenge
const challengeRes = await fetch(
  `${API_URL}/auth/challenge?walletAddress=${address}&role=INVESTOR`
);
const { message, nonce } = await challengeRes.json();

// Step 2: Sign message
const signature = await wallet.signMessage(message);

// Step 3: Login
const loginRes = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress: address, message, signature })
});

const { tokens } = await loginRes.json();
// Store tokens.access for subsequent requests
```

#### 2. Browse Auctions

```javascript
const auctionsRes = await fetch(
  `${API_URL}/marketplace/auctions?status=BIDDING`,
  {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }
);

const { auctions } = await auctionsRes.json();
// Display auctions to user
```

#### 3. Place Bid

```javascript
// Step 1: Check KYC
const isVerified = await identityRegistry.isVerified(address);
if (!isVerified) {
  // Show error: "KYC verification required"
  return;
}

// Step 2: Validate inputs
if (price < auction.reservePrice) {
  // Show error: "Price below reserve"
  return;
}

// Step 3: Approve USDC
const depositNeeded = tokenAmount * price;
const approveTx = await usdc.approve(marketplaceAddress, depositNeeded);
await approveTx.wait();

// Step 4: Submit bid on-chain
const assetIdBytes32 = '0x' + assetId.replace(/-/g, '').padEnd(64, '0');
const tokenAmountWei = ethers.parseUnits(tokenAmount.toString(), 18);
const priceWei = ethers.parseUnits(price.toString(), 6);

const bidTx = await marketplace.submitBid(
  assetIdBytes32,
  tokenAmountWei,
  priceWei
);
const receipt = await bidTx.wait();

// Step 5: Notify backend
const notifyRes = await fetch(`${API_URL}/marketplace/bids/notify`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    txHash: bidTx.hash,
    assetId,
    tokenAmount: tokenAmountWei.toString(),
    price: priceWei.toString(),
    blockNumber: receipt.blockNumber.toString()
  })
});

const { bidId } = await notifyRes.json();
// Show success message
```

#### 4. Settle Bid

```javascript
// Step 1: Get bid details
const bidsRes = await fetch(
  `${API_URL}/marketplace/bids/my-bids?assetId=${assetId}`,
  {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }
);

const { bids } = await bidsRes.json();
const bid = bids[0]; // User's bid

// Step 2: Check if auction ended
if (bid.status === 'PENDING') {
  // Show message: "Auction still active"
  return;
}

// Step 3: Settle on-chain
const assetIdBytes32 = '0x' + assetId.replace(/-/g, '').padEnd(64, '0');
const bidIndex = 0; // Usually 0 for first bid

const settleTx = await marketplace.settleBid(assetIdBytes32, bidIndex);
const receipt = await settleTx.wait();

// Step 4: Notify backend
const notifyRes = await fetch(`${API_URL}/marketplace/bids/settle-notify`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    assetId,
    bidIndex,
    txHash: settleTx.hash,
    blockNumber: receipt.blockNumber.toString()
  })
});

const { tokensReceived, refundAmount } = await notifyRes.json();
// Show settlement result
```

### Important Notes

1. **Asset Upload**: Frontend does NOT implement asset upload. Assets come via Typeform in production.

2. **KYC**: Investors must be KYC verified before bidding. Frontend should check on-chain and show error if not verified.

3. **Bid Index**: In the scripts, bid index is typically 0 for the first bid by an investor. Backend should return this value.

4. **Data Conversion**: Always convert between human-readable and wei formats correctly:
   - Tokens: 18 decimals
   - USDC: 6 decimals

5. **Transaction Flow**: Always wait for transaction confirmation before calling backend APIs.

6. **Error Handling**: Contract calls may fail due to:
   - Insufficient USDC balance
   - Insufficient allowance
   - Auction not active
   - KYC not verified
   - Bid below reserve price

---

## Missing APIs for Complete Implementation

Based on dashboard requirements, these READ-ONLY APIs are needed:

### For Admin Dashboard:

```
GET /admin/assets?status=PENDING
GET /admin/assets?status=COMPLIANCE_APPROVED
GET /marketplace/auctions?status=ENDED
```

**Purpose**: List assets/auctions by status for admin review

### For Investor Dashboard:

```
GET /portfolio
```

**Purpose**: Get investor's complete portfolio including settled bids and owned tokens

**Expected Response:**
```json
{
  "success": true,
  "portfolio": {
    "totalAssets": 3,
    "totalInvested": "15000000000",
    "assets": [
      {
        "assetId": "uuid",
        "tokensOwned": "10000000000000000000000",
        "totalPaid": "9000000000",
        "settledAt": "2025-01-18T12:00:00.000Z"
      }
    ]
  }
}
```

---

## Final Notes

1. **This documentation is based on 100% working backend scripts**
2. **No speculative features are included**
3. **All API endpoints listed are used in tested scripts**
4. **Contract interactions are verified from script implementations**
5. **Frontend should NOT implement asset upload - that's handled via Typeform**

For questions or clarifications, refer to the source scripts:
- `upload-auction-asset.sh` (testing only)
- `admin-approve.sh` (admin workflow)
- `investror-bidding.sh` (investor workflow)
- `admin-endauction.sh` (admin workflow)
- `investor-settle.sh` (investor workflow)
