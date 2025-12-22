# Authentication Flow Documentation

## Overview

This document describes the complete authentication flow for the TOA (Tokenized Open Assets) platform, including wallet-based authentication and KYC verification.

## Current Status: Mock Mode

**The application is currently running in MOCK MODE** - all backend API calls are simulated on the frontend. This allows development and testing without a backend server.

### Switching Between Mock and Real Backend

**To enable/disable mock mode:**

1. Edit your `.env` file (or `.env.local`)
2. Set `VITE_USE_MOCK_AUTH` to:
   - `true` - Use mock mode (no backend required) **[DEFAULT]**
   - `false` - Use real backend (requires backend server running)

```env
# Mock mode (development)
VITE_USE_MOCK_AUTH=true

# Real mode (production)
VITE_USE_MOCK_AUTH=false
```

## Authentication Flow Steps

### Step 1: User Clicks "Get Started"

**Location:** `src/pages/landing/Hero.page.tsx:35-46`

User clicks the "Get Started" button on the landing page, which navigates to `/auth`.

### Step 2: Navigate to Auth Page

**Location:** `src/pages/public/auth/Auth.page.tsx`

The auth page is rendered with initial state: `step = 'connect'`

### Step 3: Wallet Connection

User clicks "Connect Wallet" button, which triggers RainbowKit wallet connection.

**Technologies:**
- RainbowKit (UI)
- Wagmi (Blockchain interactions)
- User's wallet extension (MetaMask, etc.)

### Step 4: Wallet Status Check

**Endpoint:** `GET /users/exists?walletAddress=0xUSER`

**Service Method:** `authService.checkWalletStatus()`

**Location:** `src/lib/api/auth.service.ts:60-103`

Once wallet is connected, the frontend checks if the wallet address is already registered.

**Expected Response:**
```json
{
  "exists": boolean,  // true if wallet is in database
  "kyc": boolean      // true if KYC is approved
}
```

**Mock Behavior:**
- Returns `{ exists: false, kyc: false }` by default
- Can be changed in `auth.service.ts:75-76` to test different scenarios

### Step 5: UI Decision

Based on the wallet status response, the UI shows different screens:

#### Case A: Existing User (exists=true, kyc=true)
- Shows: "Welcome back" message + "Login" button
- Next step: User clicks Login → Goes to Step 7

#### Case B: New User (exists=false OR kyc=false)
- Shows: Email input + "Connect DigiLocker" button
- Next step: User enters email → Opens document upload modal

### Step 6: Document Upload (Frontend Only)

**Location:** `src/components/wallet/DocumentUploadModal.tsx`

User uploads:
- Aadhaar Card (PDF/Image, max 5MB)
- PAN Card (PDF/Image, max 5MB)

**Note:** Files are stored locally in component state, **not uploaded to server yet**.

After upload, UI changes to show "Documents Uploaded ✓" + "Complete Registration" button.

### Step 7: Authentication Flow

**This is a 3-part process:**

#### 7.1: Get Challenge

**Endpoint:** `GET /auth/challenge?walletAddress=0xUSER`

**Service Method:** `authService.getChallenge()`

**Location:** `src/lib/api/auth.service.ts:135-176`

Backend generates a unique challenge message with nonce.

**Expected Response:**
```json
{
  "message": "Sign this message to authenticate with TOA Platform\n\nWallet: 0x...\nNonce: abc123\nTimestamp: 2024-01-01T00:00:00Z",
  "nonce": "abc123"
}
```

**Mock Behavior:**
- Generates random nonce
- Creates challenge message with wallet address and timestamp

#### 7.2: Wallet Signature

User's wallet extension prompts them to sign the challenge message.

**Technology:** Wagmi's `signMessageAsync()`

This proves the user controls the wallet address.

#### 7.3: Login API Call

**Endpoint:** `POST /auth/login`

**Service Method:** `authService.login()`

**Location:** `src/lib/api/auth.service.ts:232-293`

**Request Body:**
```json
{
  "walletAddress": "0x...",
  "message": "Sign this message...",
  "signature": "0xabc123..."
}
```

**Expected Response:**
```json
{
  "user": {
    "id": "user_123",
    "walletAddress": "0x...",
    "role": "INVESTOR",
    "kyc": false
  },
  "tokens": {
    "access": "eyJhbGc...",
    "refresh": "eyJhbGc..."
  }
}
```

**Mock Behavior:**
- Generates mock JWT tokens
- Creates mock user object
- Stores tokens in localStorage

### Step 8: Post-Login Handling

**Location:** `src/pages/public/auth/Auth.page.tsx:119-129`

After successful login, check user's KYC status:

- If `user.kyc === true` → Redirect to `/dashboard`
- If `user.kyc === false` → Proceed to Step 10 (KYC submission)

### Step 9: Store User in State

**Location:** `src/stores/auth.store.ts`

User data is stored in Zustand global state for access throughout the app.

### Step 10: KYC Submission

**Endpoint:** `POST /kyc/submit`

**Service Method:** `kycService.submitKYC()`

**Location:** `src/lib/api/kyc.service.ts:121-178`

**Authentication:** Requires `Authorization: Bearer {access_token}` header

**Request Body:**
```json
{
  "source": "DOCUMENT_UPLOAD",
  "documents": {
    "aadhaar": "aadhaar_file_name.pdf",
    "pan": "pan_file_name.pdf"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "KYC submitted successfully",
  "user": {
    "id": "user_123",
    "walletAddress": "0x...",
    "role": "INVESTOR",
    "kyc": true
  }
}
```

**Mock Behavior:**
- Auto-approves KYC (sets kyc=true)
- Returns success immediately

### Step 11: Redirect to Dashboard

After successful KYC submission, user is redirected to `/dashboard`.

## API Endpoints Summary

### Public Endpoints (No Auth Required)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/users/exists` | GET | Check if wallet is registered |
| `/auth/challenge` | GET | Get challenge for signature |
| `/auth/login` | POST | Login with wallet signature |

### Protected Endpoints (Auth Required)

| Endpoint | Method | Purpose | Auth Header |
|----------|--------|---------|-------------|
| `/kyc/submit` | POST | Submit KYC documents | `Bearer {access_token}` |

## Backend Implementation Guide

### Endpoint 1: Check Wallet Status

```http
GET /users/exists?walletAddress=0xUSER
```

**Implementation:**
```typescript
// Pseudo-code
async function checkWalletStatus(walletAddress: string) {
  const user = await db.users.findOne({ walletAddress });

  return {
    exists: !!user,
    kyc: user?.kycStatus === 'APPROVED'
  };
}
```

### Endpoint 2: Get Challenge

```http
GET /auth/challenge?walletAddress=0xUSER
```

**Implementation:**
```typescript
// Pseudo-code
async function getChallenge(walletAddress: string) {
  const nonce = crypto.randomBytes(32).toString('hex');
  const timestamp = new Date().toISOString();

  // Store nonce in Redis with 5min TTL
  await redis.set(`nonce:${walletAddress}`, nonce, 'EX', 300);

  const message = `Sign this message to authenticate with TOA Platform

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${timestamp}`;

  return { message, nonce };
}
```

### Endpoint 3: Login

```http
POST /auth/login
Content-Type: application/json

{
  "walletAddress": "0x...",
  "message": "Sign this message...",
  "signature": "0xabc123..."
}
```

**Implementation:**
```typescript
// Pseudo-code
import { ethers } from 'ethers';

async function login(payload: LoginPayload) {
  // 1. Verify signature
  const recoveredAddress = ethers.utils.verifyMessage(
    payload.message,
    payload.signature
  );

  if (recoveredAddress.toLowerCase() !== payload.walletAddress.toLowerCase()) {
    throw new Error('Invalid signature');
  }

  // 2. Verify nonce (extract from message and check Redis)
  const nonce = extractNonceFromMessage(payload.message);
  const storedNonce = await redis.get(`nonce:${payload.walletAddress}`);

  if (nonce !== storedNonce) {
    throw new Error('Invalid or expired nonce');
  }

  // 3. Delete used nonce
  await redis.del(`nonce:${payload.walletAddress}`);

  // 4. Get or create user
  let user = await db.users.findOne({ walletAddress: payload.walletAddress });

  if (!user) {
    user = await db.users.create({
      walletAddress: payload.walletAddress,
      role: 'INVESTOR',
      kycStatus: 'NOT_STARTED'
    });
  }

  // 5. Generate JWT tokens
  const accessToken = jwt.sign(
    { userId: user.id, walletAddress: user.walletAddress, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // 6. Return user and tokens
  return {
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      kyc: user.kycStatus === 'APPROVED'
    },
    tokens: {
      access: accessToken,
      refresh: refreshToken
    }
  };
}
```

### Endpoint 4: KYC Submit

```http
POST /kyc/submit
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "source": "DOCUMENT_UPLOAD",
  "documents": {
    "aadhaar": "aadhaar_id",
    "pan": "pan_id"
  }
}
```

**Implementation:**
```typescript
// Pseudo-code
async function submitKYC(payload: KYCSubmitPayload, userId: string) {
  // 1. Verify user exists
  const user = await db.users.findById(userId);
  if (!user) throw new Error('User not found');

  // 2. Check if KYC already done
  if (user.kycStatus === 'APPROVED') {
    throw new Error('KYC already approved');
  }

  // 3. Store document references
  await db.kycDocuments.create([
    {
      userId: user.id,
      documentType: 'AADHAAR',
      documentIdentifier: payload.documents.aadhaar,
      source: payload.source,
      submittedAt: new Date()
    },
    {
      userId: user.id,
      documentType: 'PAN',
      documentIdentifier: payload.documents.pan,
      source: payload.source,
      submittedAt: new Date()
    }
  ]);

  // 4. Update user KYC status
  user.kycStatus = 'APPROVED'; // or 'PENDING' if manual review needed
  user.kycSubmittedAt = new Date();
  await user.save();

  // 5. Return updated user
  return {
    success: true,
    message: 'KYC submitted successfully',
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      kyc: true
    }
  };
}
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'INVESTOR',
  kyc_status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
  kyc_submitted_at TIMESTAMP,
  kyc_approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
```

### KYC Documents Table

```sql
CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  document_type VARCHAR(20) NOT NULL,
  document_identifier VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kyc_user ON kyc_documents(user_id);
```

## Security Considerations

### 1. Signature Verification
- Always verify signatures on the backend
- Never trust client-side signature verification
- Use established libraries (ethers.js, web3.js)

### 2. Nonce Management
- Generate cryptographically secure nonces
- Store nonces temporarily (Redis with TTL)
- Prevent nonce reuse (delete after use)
- Nonce should expire after 5 minutes

### 3. JWT Tokens
- Use strong secret keys (store in env variables)
- Set appropriate expiration times
- Access token: 15 minutes
- Refresh token: 7 days
- Implement token refresh endpoint

### 4. Document Storage
- Store documents in secure cloud storage (AWS S3, etc.)
- Encrypt sensitive documents at rest
- Use signed URLs for temporary access
- Implement proper access controls

### 5. Rate Limiting
- Implement rate limiting on all endpoints
- Especially important for `/auth/challenge` and `/auth/login`
- Prevent brute force attacks

## Testing Different Scenarios

### Test New User Flow

In `src/lib/api/auth.service.ts:75-76`, set:
```typescript
exists: false,
kyc: false,
```

**Expected:** Shows email input + document upload

### Test Existing User Flow

In `src/lib/api/auth.service.ts:75-76`, set:
```typescript
exists: true,
kyc: true,
```

**Expected:** Shows "Welcome back" + Login button → Goes directly to dashboard

### Test Registered but Not Verified

In `src/lib/api/auth.service.ts:75-76`, set:
```typescript
exists: true,
kyc: false,
```

**Expected:** Shows Login button → After login, requires KYC submission

## File Structure

```
src/
├── lib/
│   └── api/
│       ├── auth.service.ts     # Authentication API calls
│       └── kyc.service.ts      # KYC API calls
├── pages/
│   ├── landing/
│   │   └── Hero.page.tsx       # Landing page with "Get Started"
│   └── public/
│       └── auth/
│           └── Auth.page.tsx   # Main authentication page
├── components/
│   └── wallet/
│       ├── ConnectWallet.tsx   # Wallet connection button
│       └── DocumentUploadModal.tsx  # KYC document upload
├── stores/
│   └── auth.store.ts           # Global auth state (Zustand)
└── types/
    └── auth.types.ts           # TypeScript types for auth
```

## Environment Variables

```env
# Required
VITE_API_URL=http://localhost:3000/api
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional (defaults to true)
VITE_USE_MOCK_AUTH=true
```

## Frontend Dependencies

- **RainbowKit** - Wallet connection UI
- **Wagmi** - Ethereum library for React
- **Viem** - TypeScript Ethereum library
- **Zustand** - State management
- **React Router** - Navigation

## Next Steps for Backend Integration

1. ✅ Create the 4 endpoints listed above
2. ✅ Set up database with users and kyc_documents tables
3. ✅ Implement JWT authentication middleware
4. ✅ Set up file upload endpoint (if using real file upload)
5. ✅ Configure environment variables (JWT_SECRET, etc.)
6. ✅ Test all endpoints with Postman or similar tool
7. ✅ Update `.env` file: `VITE_USE_MOCK_AUTH=false`
8. ✅ Test the complete flow end-to-end

## Questions?

For any questions or issues with the auth flow, check the inline comments in:
- `src/lib/api/auth.service.ts`
- `src/lib/api/kyc.service.ts`
- `src/pages/public/auth/Auth.page.tsx`

All endpoints are thoroughly documented with expected request/response formats.
