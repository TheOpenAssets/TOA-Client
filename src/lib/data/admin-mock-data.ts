// src/lib/data/admin-mock-data.ts

import type {
  AdminAsset,
  Originator,
  AdminDashboardStats,
  AdminActivity,
} from '../../types/admin.types';

/**
 * Mock Originators
 */
export const mockOriginators: Originator[] = [
  {
    id: 'orig-1',
    name: 'Premium Real Estate Group',
    legalEntity: 'Premium Real Estate LLC',
    jurisdiction: 'Delaware, USA',
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    email: 'admin@premiumrealestate.com',
    kycCompleted: true,
    totalAssetsIssued: 5,
  },
  {
    id: 'orig-2',
    name: 'Global Trade Finance Corp',
    legalEntity: 'GTF Corporation',
    jurisdiction: 'Singapore',
    walletAddress: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
    email: 'compliance@gtfcorp.sg',
    kycCompleted: true,
    totalAssetsIssued: 3,
  },
  {
    id: 'orig-3',
    name: 'Renewable Energy Partners',
    legalEntity: 'REP Holdings Ltd',
    jurisdiction: 'London, UK',
    walletAddress: '0x5A0b54D5dc17e0AadC383d2db43B0a0D3E029c4c',
    email: 'contact@renewableep.co.uk',
    kycCompleted: true,
    totalAssetsIssued: 2,
  },
  {
    id: 'orig-4',
    name: 'Emerging Markets Capital',
    legalEntity: 'EMC Investment Fund',
    jurisdiction: 'Cayman Islands',
    walletAddress: '0x9A8f3a7e6B2C1d4E5F8A7B3C9D2E1F4A5B6C7D8E',
    email: 'fund@emcapital.ky',
    kycCompleted: false,
    totalAssetsIssued: 0,
  },
];

/**
 * Mock Admin Assets - Covering All Lifecycle Stages
 */
export const mockAdminAssets: AdminAsset[] = [
  // PENDING_COMPLIANCE (3 assets)
  {
    id: 'asset-pending-1',
    name: 'Downtown Commercial Plaza',
    assetType: 'Commercial Real Estate',
    description: 'Prime commercial property in downtown Manhattan with 95% occupancy rate',
    status: 'PENDING_COMPLIANCE',
    originator: mockOriginators[0],
    totalValue: 5000000,
    currency: 'USD',
    tokenPrice: 100,
    totalTokens: 50000,
    riskScore: {
      score: 25,
      level: 'LOW',
      factors: {
        originatorHistory: 90,
        documentCompleteness: 95,
        legalJurisdiction: 85,
        financialHealth: 88,
      },
    },
    compliance: {
      kycStatus: 'PENDING',
      documentsVerified: false,
    },
    uploadedAt: '2025-01-15T10:30:00Z',
    documents: [
      { name: 'Property_Deed.pdf', url: '#', verified: false },
      { name: 'Appraisal_Report.pdf', url: '#', verified: false },
      { name: 'Legal_Opinion.pdf', url: '#', verified: false },
    ],
    statusHistory: [
      {
        status: 'PENDING_COMPLIANCE',
        timestamp: '2025-01-15T10:30:00Z',
        actor: 'Premium Real Estate Group',
        notes: 'Asset uploaded for compliance review',
      },
    ],
  },
  {
    id: 'asset-pending-2',
    name: 'Trade Finance Invoice Pool Q1',
    assetType: 'Trade Finance',
    description: 'Pool of 150 invoices from verified exporters, average 90-day terms',
    status: 'PENDING_COMPLIANCE',
    originator: mockOriginators[1],
    totalValue: 2500000,
    currency: 'USD',
    tokenPrice: 50,
    totalTokens: 50000,
    riskScore: {
      score: 45,
      level: 'MEDIUM',
      factors: {
        originatorHistory: 75,
        documentCompleteness: 80,
        legalJurisdiction: 70,
        financialHealth: 72,
      },
    },
    compliance: {
      kycStatus: 'PENDING',
      documentsVerified: false,
    },
    uploadedAt: '2025-01-18T14:20:00Z',
    documents: [
      { name: 'Invoice_Pool_Summary.xlsx', url: '#', verified: false },
      { name: 'Credit_Insurance.pdf', url: '#', verified: false },
    ],
    statusHistory: [
      {
        status: 'PENDING_COMPLIANCE',
        timestamp: '2025-01-18T14:20:00Z',
        actor: 'Global Trade Finance Corp',
        notes: 'Submitted for compliance verification',
      },
    ],
  },
  {
    id: 'asset-pending-3',
    name: 'Solar Farm Project Alpha',
    assetType: 'Renewable Energy',
    description: '50MW solar installation with 20-year PPA from government utility',
    status: 'PENDING_COMPLIANCE',
    originator: mockOriginators[2],
    totalValue: 12000000,
    currency: 'USD',
    tokenPrice: 1000,
    totalTokens: 12000,
    riskScore: {
      score: 68,
      level: 'HIGH',
      factors: {
        originatorHistory: 60,
        documentCompleteness: 65,
        legalJurisdiction: 55,
        financialHealth: 58,
      },
    },
    compliance: {
      kycStatus: 'PENDING',
      documentsVerified: false,
    },
    uploadedAt: '2025-01-20T09:15:00Z',
    documents: [
      { name: 'PPA_Agreement.pdf', url: '#', verified: false },
      { name: 'Environmental_Permit.pdf', url: '#', verified: false },
      { name: 'Technical_Specs.pdf', url: '#', verified: false },
    ],
    statusHistory: [
      {
        status: 'PENDING_COMPLIANCE',
        timestamp: '2025-01-20T09:15:00Z',
        actor: 'Renewable Energy Partners',
        notes: 'Asset submitted for review',
      },
    ],
  },

  // COMPLIANCE_APPROVED (2 assets)
  {
    id: 'asset-approved-1',
    name: 'Luxury Apartment Complex - Miami',
    assetType: 'Residential Real Estate',
    description: '200-unit luxury apartment building in Miami Beach waterfront',
    status: 'COMPLIANCE_APPROVED',
    originator: mockOriginators[0],
    totalValue: 80000000,
    currency: 'USD',
    tokenPrice: 1000,
    totalTokens: 80000,
    riskScore: {
      score: 18,
      level: 'LOW',
      factors: {
        originatorHistory: 95,
        documentCompleteness: 98,
        legalJurisdiction: 92,
        financialHealth: 94,
      },
    },
    compliance: {
      kycStatus: 'COMPLETED',
      kycProvider: 'Chainalysis',
      kycTriggeredAt: '2025-01-10T11:00:00Z',
      kycCompletedAt: '2025-01-12T16:30:00Z',
      documentsVerified: true,
      complianceOfficer: 'Sarah Chen',
      approvedAt: '2025-01-13T09:45:00Z',
    },
    uploadedAt: '2025-01-10T08:00:00Z',
    documents: [
      { name: 'Property_Title.pdf', url: '#', verified: true },
      { name: 'Building_Plans.pdf', url: '#', verified: true },
      { name: 'Occupancy_Permit.pdf', url: '#', verified: true },
    ],
    statusHistory: [
      {
        status: 'PENDING_COMPLIANCE',
        timestamp: '2025-01-10T08:00:00Z',
        actor: 'Premium Real Estate Group',
        notes: 'Asset uploaded',
      },
      {
        status: 'COMPLIANCE_APPROVED',
        timestamp: '2025-01-13T09:45:00Z',
        actor: 'Sarah Chen',
        notes: 'All compliance checks passed',
      },
    ],
  },
  {
    id: 'asset-approved-2',
    name: 'Corporate Bond Portfolio 2025',
    assetType: 'Corporate Bonds',
    description: 'Diversified portfolio of investment-grade corporate bonds',
    status: 'COMPLIANCE_APPROVED',
    originator: mockOriginators[1],
    totalValue: 15000000,
    currency: 'USD',
    tokenPrice: 500,
    totalTokens: 30000,
    riskScore: {
      score: 22,
      level: 'LOW',
      factors: {
        originatorHistory: 88,
        documentCompleteness: 92,
        legalJurisdiction: 90,
        financialHealth: 85,
      },
    },
    compliance: {
      kycStatus: 'COMPLETED',
      kycProvider: 'Elliptic',
      kycTriggeredAt: '2025-01-08T10:00:00Z',
      kycCompletedAt: '2025-01-10T14:20:00Z',
      documentsVerified: true,
      complianceOfficer: 'Michael Torres',
      approvedAt: '2025-01-11T11:00:00Z',
    },
    uploadedAt: '2025-01-08T07:30:00Z',
    documents: [
      { name: 'Bond_Prospectus.pdf', url: '#', verified: true },
      { name: 'Credit_Rating.pdf', url: '#', verified: true },
    ],
    statusHistory: [
      {
        status: 'PENDING_COMPLIANCE',
        timestamp: '2025-01-08T07:30:00Z',
        actor: 'Global Trade Finance Corp',
        notes: 'Portfolio submitted',
      },
      {
        status: 'COMPLIANCE_APPROVED',
        timestamp: '2025-01-11T11:00:00Z',
        actor: 'Michael Torres',
        notes: 'Compliance verified',
      },
    ],
  },

  // REGISTERED (1 asset)
  {
    id: 'asset-registered-1',
    name: 'Office Building - Singapore CBD',
    assetType: 'Commercial Real Estate',
    description: 'Grade-A office building in Singapore Central Business District',
    status: 'REGISTERED',
    originator: mockOriginators[1],
    totalValue: 45000000,
    currency: 'USD',
    tokenPrice: 1500,
    totalTokens: 30000,
    riskScore: {
      score: 15,
      level: 'LOW',
      factors: {
        originatorHistory: 92,
        documentCompleteness: 96,
        legalJurisdiction: 94,
        financialHealth: 91,
      },
    },
    compliance: {
      kycStatus: 'COMPLETED',
      kycProvider: 'Chainalysis',
      kycTriggeredAt: '2024-12-20T09:00:00Z',
      kycCompletedAt: '2024-12-22T15:00:00Z',
      documentsVerified: true,
      complianceOfficer: 'Sarah Chen',
      approvedAt: '2024-12-23T10:00:00Z',
    },
    registry: {
      blobId: '0xblob_1a2b3c4d5e6f7890abcdef',
      attestationHash: '0xattest_9876543210fedcba',
      registryContract: '0x1234567890123456789012345678901234567890',
      registeredAt: '2025-01-05T14:30:00Z',
      registeredBy: 'Admin: Alex Kumar',
      mantleExplorerUrl: 'https://explorer.mantle.xyz/tx/0xreg123',
    },
    uploadedAt: '2024-12-20T08:00:00Z',
    documents: [
      { name: 'Property_Deed.pdf', url: '#', verified: true },
      { name: 'Valuation_Report.pdf', url: '#', verified: true },
      { name: 'Lease_Agreements.pdf', url: '#', verified: true },
    ],
    statusHistory: [
      {
        status: 'PENDING_COMPLIANCE',
        timestamp: '2024-12-20T08:00:00Z',
        actor: 'Global Trade Finance Corp',
        notes: 'Asset uploaded',
      },
      {
        status: 'COMPLIANCE_APPROVED',
        timestamp: '2024-12-23T10:00:00Z',
        actor: 'Sarah Chen',
        notes: 'Compliance approved',
      },
      {
        status: 'REGISTERED',
        timestamp: '2025-01-05T14:30:00Z',
        actor: 'Admin: Alex Kumar',
        notes: 'Registered on Mantle with BlobID and attestation',
      },
    ],
  },

  // TOKENIZED (2 assets)
  {
    id: 'asset-tokenized-1',
    name: 'Industrial Warehouse Portfolio',
    assetType: 'Industrial Real Estate',
    description: '5 logistics warehouses in strategic US locations',
    status: 'TOKENIZED',
    originator: mockOriginators[0],
    totalValue: 35000000,
    currency: 'USD',
    tokenPrice: 700,
    totalTokens: 50000,
    riskScore: {
      score: 20,
      level: 'LOW',
      factors: {
        originatorHistory: 90,
        documentCompleteness: 94,
        legalJurisdiction: 88,
        financialHealth: 89,
      },
    },
    compliance: {
      kycStatus: 'COMPLETED',
      kycProvider: 'Elliptic',
      kycTriggeredAt: '2024-11-15T10:00:00Z',
      kycCompletedAt: '2024-11-17T12:00:00Z',
      documentsVerified: true,
      complianceOfficer: 'Michael Torres',
      approvedAt: '2024-11-18T09:00:00Z',
    },
    registry: {
      blobId: '0xblob_fedcba9876543210',
      attestationHash: '0xattest_0123456789abcdef',
      registryContract: '0x1234567890123456789012345678901234567890',
      registeredAt: '2024-12-01T11:00:00Z',
      registeredBy: 'Admin: Alex Kumar',
      mantleExplorerUrl: 'https://explorer.mantle.xyz/tx/0xreg456',
    },
    tokenization: {
      tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      tokenStandard: 'ERC-3643',
      tokenSymbol: 'IWPT',
      totalSupply: 50000,
      deployedAt: '2024-12-15T16:45:00Z',
      deployedBy: 'Admin: Alex Kumar',
      tokenExplorerUrl: 'https://explorer.mantle.xyz/token/0xtoken789',
    },
    uploadedAt: '2024-11-15T08:00:00Z',
    documents: [
      { name: 'Portfolio_Summary.pdf', url: '#', verified: true },
      { name: 'Property_Valuations.pdf', url: '#', verified: true },
      { name: 'Tenant_Contracts.pdf', url: '#', verified: true },
    ],
    statusHistory: [
      {
        status: 'PENDING_COMPLIANCE',
        timestamp: '2024-11-15T08:00:00Z',
        actor: 'Premium Real Estate Group',
        notes: 'Asset uploaded',
      },
      {
        status: 'COMPLIANCE_APPROVED',
        timestamp: '2024-11-18T09:00:00Z',
        actor: 'Michael Torres',
        notes: 'Compliance approved',
      },
      {
        status: 'REGISTERED',
        timestamp: '2024-12-01T11:00:00Z',
        actor: 'Admin: Alex Kumar',
        notes: 'Registered on Mantle',
      },
      {
        status: 'TOKENIZED',
        timestamp: '2024-12-15T16:45:00Z',
        actor: 'Admin: Alex Kumar',
        notes: 'ERC-3643 token deployed',
      },
    ],
  },
  {
    id: 'asset-tokenized-2',
    name: 'Green Energy Infrastructure Fund',
    assetType: 'Renewable Energy',
    description: 'Portfolio of wind and solar projects across Europe',
    status: 'TOKENIZED',
    originator: mockOriginators[2],
    totalValue: 28000000,
    currency: 'USD',
    tokenPrice: 2000,
    totalTokens: 14000,
    riskScore: {
      score: 28,
      level: 'LOW',
      factors: {
        originatorHistory: 85,
        documentCompleteness: 90,
        legalJurisdiction: 82,
        financialHealth: 86,
      },
    },
    compliance: {
      kycStatus: 'COMPLETED',
      kycProvider: 'Chainalysis',
      kycTriggeredAt: '2024-10-10T09:00:00Z',
      kycCompletedAt: '2024-10-12T14:00:00Z',
      documentsVerified: true,
      complianceOfficer: 'Sarah Chen',
      approvedAt: '2024-10-13T10:30:00Z',
    },
    registry: {
      blobId: '0xblob_aabbccddee112233',
      attestationHash: '0xattest_33221100eeddccbb',
      registryContract: '0x1234567890123456789012345678901234567890',
      registeredAt: '2024-11-01T13:20:00Z',
      registeredBy: 'Admin: Jessica Lee',
      mantleExplorerUrl: 'https://explorer.mantle.xyz/tx/0xreg789',
    },
    tokenization: {
      tokenAddress: '0x9876543210987654321098765432109876543210',
      tokenStandard: 'ERC-3643',
      tokenSymbol: 'GEIF',
      totalSupply: 14000,
      deployedAt: '2024-11-20T10:00:00Z',
      deployedBy: 'Admin: Jessica Lee',
      tokenExplorerUrl: 'https://explorer.mantle.xyz/token/0xtoken456',
    },
    uploadedAt: '2024-10-10T07:00:00Z',
    documents: [
      { name: 'Fund_Prospectus.pdf', url: '#', verified: true },
      { name: 'Project_Portfolio.pdf', url: '#', verified: true },
      { name: 'Power_Purchase_Agreements.pdf', url: '#', verified: true },
    ],
    statusHistory: [
      {
        status: 'PENDING_COMPLIANCE',
        timestamp: '2024-10-10T07:00:00Z',
        actor: 'Renewable Energy Partners',
        notes: 'Fund submitted',
      },
      {
        status: 'COMPLIANCE_APPROVED',
        timestamp: '2024-10-13T10:30:00Z',
        actor: 'Sarah Chen',
        notes: 'Compliance approved',
      },
      {
        status: 'REGISTERED',
        timestamp: '2024-11-01T13:20:00Z',
        actor: 'Admin: Jessica Lee',
        notes: 'Registered on Mantle',
      },
      {
        status: 'TOKENIZED',
        timestamp: '2024-11-20T10:00:00Z',
        actor: 'Admin: Jessica Lee',
        notes: 'ERC-3643 token deployed',
      },
    ],
  },

  // YIELDING (1 asset with active settlements)
  {
    id: 'asset-yielding-1',
    name: 'Prime Retail Center - Los Angeles',
    assetType: 'Commercial Real Estate',
    description: 'High-traffic retail center with anchor tenants in LA',
    status: 'YIELDING',
    originator: mockOriginators[0],
    totalValue: 60000000,
    currency: 'USD',
    tokenPrice: 1200,
    totalTokens: 50000,
    riskScore: {
      score: 12,
      level: 'LOW',
      factors: {
        originatorHistory: 96,
        documentCompleteness: 98,
        legalJurisdiction: 95,
        financialHealth: 93,
      },
    },
    compliance: {
      kycStatus: 'COMPLETED',
      kycProvider: 'Elliptic',
      kycTriggeredAt: '2024-08-01T09:00:00Z',
      kycCompletedAt: '2024-08-03T11:00:00Z',
      documentsVerified: true,
      complianceOfficer: 'Michael Torres',
      approvedAt: '2024-08-04T10:00:00Z',
    },
    registry: {
      blobId: '0xblob_11223344556677889900',
      attestationHash: '0xattest_00998877665544332211',
      registryContract: '0x1234567890123456789012345678901234567890',
      registeredAt: '2024-09-01T14:00:00Z',
      registeredBy: 'Admin: Alex Kumar',
      mantleExplorerUrl: 'https://explorer.mantle.xyz/tx/0xreg111',
    },
    tokenization: {
      tokenAddress: '0xfedcba0987654321fedcba0987654321fedcba09',
      tokenStandard: 'ERC-3643',
      tokenSymbol: 'PRCLA',
      totalSupply: 50000,
      deployedAt: '2024-10-01T12:30:00Z',
      deployedBy: 'Admin: Alex Kumar',
      tokenExplorerUrl: 'https://explorer.mantle.xyz/token/0xtoken111',
    },
    yield: {
      totalDistributed: 450000,
      lastDistribution: '2025-01-15T10:00:00Z',
      distributionFrequency: 'MONTHLY',
      nextDistributionDate: '2025-02-15T10:00:00Z',
      settlements: [
        {
          id: 'settle-1',
          fiatAmount: 150000,
          currency: 'USD',
          usdcAmount: 150000,
          settlementDate: '2024-11-15',
          recordedAt: '2024-11-16T09:00:00Z',
          recordedBy: 'Admin: Alex Kumar',
          transactionHash: '0xtx_settlement_nov',
        },
        {
          id: 'settle-2',
          fiatAmount: 150000,
          currency: 'USD',
          usdcAmount: 150000,
          settlementDate: '2024-12-15',
          recordedAt: '2024-12-16T09:00:00Z',
          recordedBy: 'Admin: Alex Kumar',
          transactionHash: '0xtx_settlement_dec',
        },
        {
          id: 'settle-3',
          fiatAmount: 150000,
          currency: 'USD',
          usdcAmount: 150000,
          settlementDate: '2025-01-15',
          recordedAt: '2025-01-16T09:00:00Z',
          recordedBy: 'Admin: Jessica Lee',
          transactionHash: '0xtx_settlement_jan',
        },
      ],
    },
    uploadedAt: '2024-08-01T08:00:00Z',
    documents: [
      { name: 'Property_Title.pdf', url: '#', verified: true },
      { name: 'Lease_Agreements.pdf', url: '#', verified: true },
      { name: 'Financial_Projections.pdf', url: '#', verified: true },
    ],
    statusHistory: [
      {
        status: 'PENDING_COMPLIANCE',
        timestamp: '2024-08-01T08:00:00Z',
        actor: 'Premium Real Estate Group',
        notes: 'Asset uploaded',
      },
      {
        status: 'COMPLIANCE_APPROVED',
        timestamp: '2024-08-04T10:00:00Z',
        actor: 'Michael Torres',
        notes: 'Compliance approved',
      },
      {
        status: 'REGISTERED',
        timestamp: '2024-09-01T14:00:00Z',
        actor: 'Admin: Alex Kumar',
        notes: 'Registered on Mantle',
      },
      {
        status: 'TOKENIZED',
        timestamp: '2024-10-01T12:30:00Z',
        actor: 'Admin: Alex Kumar',
        notes: 'ERC-3643 token deployed',
      },
      {
        status: 'YIELDING',
        timestamp: '2024-11-16T09:00:00Z',
        actor: 'Admin: Alex Kumar',
        notes: 'First settlement recorded',
      },
    ],
  },
];

/**
 * Calculate Dashboard Stats from Mock Data
 */
export const calculateAdminStats = (): AdminDashboardStats => {
  const pendingCompliance = mockAdminAssets.filter(
    (a) => a.status === 'PENDING_COMPLIANCE'
  ).length;

  const complianceApproved = mockAdminAssets.filter(
    (a) => a.status === 'COMPLIANCE_APPROVED'
  ).length;

  const onChainAssets = mockAdminAssets.filter(
    (a) => a.status === 'REGISTERED' || a.status === 'TOKENIZED' || a.status === 'YIELDING'
  ).length;

  const totalYieldDistributed = mockAdminAssets.reduce((sum, asset) => {
    return sum + (asset.yield?.totalDistributed || 0);
  }, 0);

  const assetsUnderManagement = mockAdminAssets.reduce((sum, asset) => {
    return sum + asset.totalValue;
  }, 0);

  const totalOriginators = mockOriginators.length;

  return {
    pendingCompliance,
    complianceApproved,
    onChainAssets,
    totalYieldDistributed,
    assetsUnderManagement,
    totalOriginators,
  };
};

/**
 * Mock Activity Log
 */
export const mockAdminActivities: AdminActivity[] = [
  {
    id: 'act-1',
    type: 'YIELD_DISTRIBUTED',
    assetName: 'Prime Retail Center - Los Angeles',
    actor: 'Admin: Jessica Lee',
    timestamp: '2025-01-16T09:00:00Z',
    details: 'Distributed $150,000 USDC to token holders',
  },
  {
    id: 'act-2',
    type: 'ASSET_TOKENIZED',
    assetName: 'Industrial Warehouse Portfolio',
    actor: 'Admin: Alex Kumar',
    timestamp: '2024-12-15T16:45:00Z',
    details: 'Deployed ERC-3643 token (IWPT) - 50,000 tokens',
  },
  {
    id: 'act-3',
    type: 'COMPLIANCE_APPROVED',
    assetName: 'Corporate Bond Portfolio 2025',
    actor: 'Michael Torres',
    timestamp: '2025-01-11T11:00:00Z',
    details: 'Compliance verification completed',
  },
  {
    id: 'act-4',
    type: 'ASSET_REGISTERED',
    assetName: 'Office Building - Singapore CBD',
    actor: 'Admin: Alex Kumar',
    timestamp: '2025-01-05T14:30:00Z',
    details: 'Registered on Mantle with BlobID',
  },
  {
    id: 'act-5',
    type: 'COMPLIANCE_APPROVED',
    assetName: 'Luxury Apartment Complex - Miami',
    actor: 'Sarah Chen',
    timestamp: '2025-01-13T09:45:00Z',
    details: 'All compliance checks passed',
  },
];
