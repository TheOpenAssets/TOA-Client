# Authentication Flow Documentation

## Overview
Complete signup + login flow with wallet-based authentication using RainbowKit, with KYC verification via DigiLocker simulation.

## Tech Stack
- **Wallet Connection**: RainbowKit + Wagmi + Viem
- **State Management**: Zustand
- **Routing**: React Router v7

## User Flow

### 1. Landing Page
- User sees "Get Started" CTA button
- Clicking redirects to `/auth`
- ✅ No wallet connection on landing page

### 2. Auth Page (`/auth`)
**Layout**: Split screen
- **Left**: Static illustration / onboarding
- **Right**: Authentication panel

### 3. Wallet Connection
- Right panel shows "Connect Wallet" button (RainbowKit)
- After connection:
  - Display shortened wallet address
  - Immediately call backend to check wallet status

### 4. Wallet Status Pre-Check (CRITICAL)
**API Call**: `GET /users/exists?walletAddress=0xUSER`

**Response**:
```json
{
  "exists": boolean,
  "kyc": boolean
}
```

### 5. UI Decision Based on Response

#### Case A: Existing KYC User
**Condition**: `{ "exists": true, "kyc": true }`

**UI**:
- Show text: "Welcome back"
- Show button: "Login"
- ❌ NO DigiLocker
- ❌ NO identity verification

**User Action**: Click "Login" → Proceed to wallet signature

#### Case B: New User / No KYC
**Condition**: `{ "exists": false, "kyc": false }`

**UI**:
- Show DigiLocker-style identity verification screen
- Frontend-only simulation
- No real API calls

### 6. DigiLocker Simulation (Frontend Only)

**Steps**:
1. Show "Verify your identity" title
2. Button: "Connect DigiLocker"
3. Loading states:
   - "Fetching Aadhaar details..."
   - "Fetching PAN details..."
4. Show masked previews:
   - Aadhaar: `XXXX-XXXX-1234`
   - PAN: `ABCDE1234F`
5. Button: "Continue"

**Important**: 
- ❌ No real API calls
- ❌ No manual input fields
- ✅ Pure frontend simulation

### 7. Authentication Flow (Both Cases)

#### Step 7.1: Get Challenge
```typescript
GET /auth/challenge?walletAddress=0xUSER

Response:
{
  "message": "Sign this message...\nNonce: ...",
  "nonce": "..."
}
```

#### Step 7.2: Wallet Signs Message
- User signs exact message from challenge
- Uses RainbowKit's `useSignMessage` hook
- No transaction, no gas, no extra data

#### Step 7.3: Login API (AUTH ONLY)
```typescript
POST /auth/login

Payload (STRICT):
{
  "walletAddress": "0xUSER",
  "message": "message from challenge",
  "signature": "wallet signature"
}
```

**CRITICAL**:
- 🚫 Do NOT send KYC data
- 🚫 Do NOT change payload structure
- ✅ This is ONLY for authentication

### 8. Backend Login Result
```json
{
  "user": {
    "id": "userId",
    "walletAddress": "0xUSER",
    "role": "INVESTOR",
    "kyc": boolean
  },
  "tokens": {
    "access": "ACCESS_TOKEN",
    "refresh": "REFRESH_TOKEN"
  }
}
```

### 9. Post-Login Handling

**If `user.kyc === true`**:
- Store tokens in localStorage
- Update auth store with user data
- Redirect to `/dashboard`

**If `user.kyc === false`**:
- Proceed to KYC completion

### 10. KYC Completion API (Separate)

**Only for users who saw DigiLocker simulation**

```typescript
POST /kyc/submit
Authorization: Bearer ACCESS_TOKEN

Payload:
{
  "source": "DIGILOCKER_SIMULATION",
  "documents": {
    "aadhaar": "XXXX-XXXX-1234",
    "pan": "ABCDE1234F"
  }
}
```

**Backend Updates**:
- Set `user.kyc = true`

**After Success**:
- Redirect to `/dashboard`

## File Structure

```
src/
├── pages/public/auth/
│   └── Auth.page.tsx              # Main auth page with full flow
├── components/wallet/
│   ├── ConnectWallet.tsx          # RainbowKit wallet connection
│   ├── WalletAddress.tsx          # Display shortened address
│   └── DigiLockerSimulation.tsx   # DigiLocker UI simulation
├── lib/api/
│   ├── auth.service.ts            # Auth API calls
│   └── kyc.service.ts             # KYC API calls (separate)
├── stores/
│   └── auth.store.ts              # Zustand auth state
├── types/
│   └── auth.types.ts              # TypeScript types
└── app/providers/
    └── WalletProvider.tsx         # RainbowKit + Wagmi setup
```

## Key Rules

1. ✅ **No passwords** - Wallet signature only
2. ✅ **No form-based KYC** - DigiLocker simulation
3. ✅ **No KYC data in `/auth/login`** - Separate APIs
4. ✅ **Wallet signature happens once** - During login
5. ✅ **Auth APIs not modified** - Strict payload structure
6. ✅ **DigiLocker is UI simulation only** - No backend calls
7. ✅ **Existing KYC wallets never see DigiLocker** - Check status first

## Environment Variables

Create `.env` file:
```bash
VITE_API_URL=http://localhost:3000/api
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

Get WalletConnect Project ID from: https://cloud.walletconnect.com/

## Testing the Flow

### Test Case 1: New User
1. Navigate to landing page
2. Click "Get Started"
3. Connect wallet (new address)
4. See DigiLocker simulation
5. Complete DigiLocker steps
6. Sign wallet message
7. KYC submitted automatically
8. Redirected to dashboard

### Test Case 2: Existing KYC User
1. Navigate to landing page
2. Click "Get Started"
3. Connect wallet (known address with KYC)
4. See "Welcome back" message
5. Click "Login"
6. Sign wallet message
7. Redirected to dashboard immediately

### Test Case 3: Existing User Without KYC
1. Connect wallet (known address without KYC)
2. See DigiLocker simulation
3. Complete verification
4. Auto-login after KYC

## Error Handling

- **Nonce expired**: Show error, allow retry
- **Invalid signature**: Show error, request new signature
- **Wallet rejected**: Show error, return to connect state
- **API errors**: Display user-friendly messages
- **Network errors**: Show retry option

## Core Principle

> Check wallet KYC status first, show DigiLocker only if needed, then authenticate with a single wallet signature.
