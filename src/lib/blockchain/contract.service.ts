import { keccak256, toUtf8Bytes } from 'ethers';

// Fix assetId to bytes32 conversion - UUID needs proper encoding
export function uuidToBytes32(uuid: string): string {
  // Remove hyphens from UUID
  const hex = uuid.replace(/-/g, '');
  // Pad to 32 bytes (64 hex chars)
  return '0x' + hex.padEnd(64, '0');
}

// Or alternatively, use keccak256 hash:
export function assetIdToBytes32(assetId: string): string {
  return keccak256(toUtf8Bytes(assetId));
}

// Fix token amount calculation - ensure proper wei conversion
export function calculateTokenAmount(amount: string, decimals: number = 18): bigint {
  const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
  return amountBigInt;
}
