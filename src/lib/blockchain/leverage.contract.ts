import { parseUnits } from 'viem';

/**
 * Leverage Contract Addresses (Mantle Sepolia Testnet)
 * Deployed on: 2025-12-31
 */
export const LEVERAGE_CONTRACTS = {
  LeverageVault: '0x67682FfFb86793635050a3d0bCdD95983659660B',
  MockMETH: '0x4Ade8aAa0143526393EcadA836224EF21aBC6ac6',
  MockFluxionDEX: '0x882eA0d81d445CF9e696869af4D007008281892D',
  SeniorPool: '0x98da55a2B4281d6872D17F90119d48A5C19341b1',
} as const;

/**
 * mETH (ERC20) ABI
 */
export const METH_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

/**
 * LeverageVault ABI
 */
export const LEVERAGE_VAULT_ABI = [
  {
    name: 'createPosition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'mETHAmount', type: 'uint256' },
      { name: 'usdcToBorrow', type: 'uint256' },
      { name: 'rwaToken', type: 'address' },
      { name: 'rwaTokenAmount', type: 'uint256' },
      { name: 'assetId', type: 'string' },
      { name: 'mETHPriceUSD', type: 'uint256' }
    ],
    outputs: [{ name: 'positionId', type: 'uint256' }],
  },
  {
    name: 'getPosition',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'positionId', type: 'uint256' }],
    outputs: [
      {
        components: [
          { name: 'user', type: 'address' },
          { name: 'mETHCollateral', type: 'uint256' },
          { name: 'usdcBorrowed', type: 'uint256' },
          { name: 'rwaToken', type: 'address' },
          { name: 'rwaTokenAmount', type: 'uint256' },
          { name: 'assetId', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'lastHarvestTime', type: 'uint256' },
          { name: 'totalInterestPaid', type: 'uint256' },
          { name: 'active', type: 'bool' }
        ],
        type: 'tuple'
      }
    ],
  },
  {
    name: 'getHealthFactor',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'positionId', type: 'uint256' },
      { name: 'mETHPriceUSD', type: 'uint256' }
    ],
    outputs: [{ type: 'uint256' }],
  }
] as const;