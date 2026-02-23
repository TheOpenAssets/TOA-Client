# Fix Listing - Add Token Approval

## Problem

Asset `87a17e86-d381-4f1b-8555-44acd5a84664` was listed on the marketplace **WITHOUT** the originator approving the marketplace to transfer RWA tokens.

### Error Details
```
ERC20InsufficientAllowance(
  spender: 0x444a6f69FC9411d0ea9627CbDdBD3Dfa563aE615,  // Marketplace
  allowance: 0,                                          // Current allowance
  needed: 1000000000000000000000                         // 1000 tokens needed
)
```

## Backend Fix Required

The backend needs to run this transaction from the **ORIGINATOR's wallet**:

### Step 1: Identify the Originator

```bash
# Query backend for asset details
curl -X GET "http://localhost:3000/admin/assets/87a17e86-d381-4f1b-8555-44acd5a84664" \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

Response should show:
```json
{
  "originator": "0x2B87...",  // This is the originator wallet
  "token": {
    "address": "0xeF031f7f75B981Ad7c0A9b31a0eBD9F8eCb1d0Db"
  }
}
```

### Step 2: Create Fix Script (Backend)

Save this as `scripts/fix-listing-approval.js`:

```javascript
#!/usr/bin/env node

/**
 * Fix Listing Approval
 * Approve marketplace to transfer RWA tokens from originator
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const deployedContracts = JSON.parse(
  readFileSync('./packages/contracts/deployed_contracts.json', 'utf-8')
);

const TOKEN_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

async function fixListingApproval() {
  const assetId = process.argv[2];
  if (!assetId) {
    console.error('Usage: node scripts/fix-listing-approval.js <assetId>');
    process.exit(1);
  }

  console.log('🔧 Fixing Listing Approval');
  console.log('━'.repeat(50));
  console.log('Asset ID:', assetId);

  // Get asset details from backend
  const response = await fetch(`http://localhost:3000/admin/assets/${assetId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.ADMIN_JWT}`
    }
  });

  const asset = await response.json();
  const tokenAddress = asset.token.address;
  const originator = asset.originator;

  console.log('Token Address:', tokenAddress);
  console.log('Originator:', originator);

  // Connect to arbitrum Sepolia with ORIGINATOR wallet
  // IMPORTANT: Use the originator's private key
  const originatorPrivateKey = process.env.ORIGINATOR_PRIVATE_KEY;
  if (!originatorPrivateKey) {
    console.error('❌ ORIGINATOR_PRIVATE_KEY not set in environment');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.arbitrum.xyz');
  const wallet = new ethers.Wallet(originatorPrivateKey, provider);

  console.log('Wallet Address:', wallet.address);

  if (wallet.address.toLowerCase() !== originator.toLowerCase()) {
    console.error('❌ Wallet mismatch! ORIGINATOR_PRIVATE_KEY does not match asset originator');
    console.error(`  Expected: ${originator}`);
    console.error(`  Got: ${wallet.address}`);
    process.exit(1);
  }

  const marketplaceAddress = deployedContracts.contracts.PrimaryMarketplace;
  const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);

  // Check current allowance
  console.log('\n📋 Checking current allowance...');
  const currentAllowance = await tokenContract.allowance(wallet.address, marketplaceAddress);
  console.log('Current Allowance:', ethers.formatUnits(currentAllowance, 18), 'tokens');

  // Get total supply
  const totalSupply = await tokenContract.totalSupply();
  console.log('Total Supply:', ethers.formatUnits(totalSupply, 18), 'tokens');

  // Get balance
  const balance = await tokenContract.balanceOf(wallet.address);
  console.log('Originator Balance:', ethers.formatUnits(balance, 18), 'tokens');

  if (currentAllowance >= totalSupply) {
    console.log('✅ Already approved! No action needed.');
    return;
  }

  // Approve marketplace to spend ALL tokens
  console.log('\n✅ Approving marketplace to spend tokens...');
  console.log('Approving:', ethers.formatUnits(totalSupply, 18), 'tokens');

  const tx = await tokenContract.approve(marketplaceAddress, totalSupply);
  console.log('Approval TX:', tx.hash);
  console.log('⏳ Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log('✅ Approved in block', receipt.blockNumber);
  console.log('\n✅ Fix Complete!');
  console.log('━'.repeat(50));
  console.log(`Explorer: https://explorer.sepolia.arbitrum.xyz/tx/${tx.hash}`);
  console.log('\nYou can now purchase tokens from this asset on the frontend!');
}

fixListingApproval().catch(console.error);
```

### Step 3: Run the Fix

```bash
cd TOA-Server-arbitrum

# Set the originator's private key
export ORIGINATOR_PRIVATE_KEY="0x..."  # The originator wallet's private key
export ADMIN_JWT="<your-admin-jwt>"

# Run the fix script
node scripts/fix-listing-approval.js 87a17e86-d381-4f1b-8555-44acd5a84664
```

Expected output:
```
🔧 Fixing Listing Approval
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Asset ID: 87a17e86-d381-4f1b-8555-44acd5a84664
Token Address: 0xeF031f7f75B981Ad7c0A9b31a0eBD9F8eCb1d0Db
Originator: 0x2B87...

📋 Checking current allowance...
Current Allowance: 0.0 tokens
Total Supply: 100000.0 tokens
Originator Balance: 100000.0 tokens

✅ Approving marketplace to spend tokens...
Approving: 100000.0 tokens
Approval TX: 0x...
⏳ Waiting for confirmation...
✅ Approved in block 32558XXX

✅ Fix Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Explorer: https://explorer.sepolia.arbitrum.xyz/tx/0x...

You can now purchase tokens from this asset on the frontend!
```

### Step 4: Test Purchase Again

After running the fix script:

1. Refresh the frontend
2. Navigate to asset `87a17e86-d381-4f1b-8555-44acd5a84664`
3. Try purchasing 1000 tokens again
4. It should now work! ✅

## Alternative: Use the Working Asset

While waiting for the fix, you can test purchases with the asset that already works:

```
Asset ID: 9482d1dc-b852-417f-ab7e-f8a1cdd44057
Invoice: INV-2025-637514
Token: 0xF837236ea7e3c8fFd1250C62F7c00E1C04ec2E4D
```

This asset has proper approvals and purchases work perfectly.

## How to Prevent This in Future

When listing assets, the backend `list-on-marketplace` endpoint should ALWAYS:

1. **Deploy token** (if not already deployed)
2. **Approve marketplace** ← THIS WAS MISSING!
   ```javascript
   await tokenContract.approve(marketplaceAddress, totalSupply);
   ```
3. **Create listing**
   ```javascript
   await marketplace.createListing(assetId, ...params);
   ```

Update the backend listing logic to include step 2!
