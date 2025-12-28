// src/lib/data/asset-details-mock.ts

export const mockAssetDetails: any = {
  id: '1',
  name: 'Manufacturing Invoice Q1',
  assetType: 'Invoice-backed RWA',
  status: 'LISTED',
  tokenDistribution: {
    totalTokens: 100000,
    soldTokens: 48000,
    unsoldTokens: 52000,
    claimableTokens: 0,
    tokenPrice: 50.0,
  },
  invoice: {
    invoiceNumber: 'INV-2401',
    amount: 5000000,
    dueDate: '2026-03-15T00:00:00Z',
    description: 'Invoice for supply of electronic components to a major manufacturer.',
    issueDate: '2025-12-15T00:00:00Z',
    paymentTerms: '90 days',
  },
  riskFactors: [
    {
      level: 'low',
      category: 'Credit Risk',
      description: 'The invoice is from a highly reputable buyer with a strong payment history.',
    },
  ],
  audit: {
    auditor: 'DeFi Trust',
    auditDate: '2025-12-10T00:00:00Z',
    status: 'completed',
    reportUrl: '#',
    findings: 'No major issues found.',
  },
  createdAt: '2025-12-15T00:00:00Z',
  updatedAt: '2025-12-15T00:00:00Z',
  imageUrl: '',
  location: 'Mumbai, India',
  overview:
    'This asset represents a fractionalized interest in a high-value invoice issued for the supply of electronic components. The underlying invoice is a short-term debt instrument, offering a predictable yield upon maturity.',
};
