// src/lib/data/mock-assets.ts

export const mockAssets: any[] = [
  {
    id: '1',
    name: 'Downtown Mumbai Commercial Property',
    assetType: 'Real Estate',
    status: 'LISTED',
    location: 'Mumbai, Maharashtra, India',
    overview:
      'Premium commercial property located in the heart of Mumbai business district. This property features modern amenities and high-grade infrastructure, making it ideal for corporate offices and retail spaces.',
    tokenDistribution: {
      totalTokens: 1000,
      soldTokens: 800,
      unsoldTokens: 200,
      claimableTokens: 200,
      tokenPrice: 100,
    },
    invoice: {
      invoiceNumber: 'INV-2025-001',
      amount: 100000,
      dueDate: '2025-06-30',
      issueDate: '2025-01-15',
      description:
        'Commercial property lease agreement for downtown Mumbai property. Includes maintenance fees, property management charges, and annual lease payments from tenants.',
      paymentTerms: 'Net 30',
    },
    riskFactors: [
      {
        level: 'low',
        category: 'Market Risk',
        description:
          'The Mumbai commercial real estate market has shown consistent growth over the past decade with strong demand from corporate tenants.',
      },
      {
        level: 'medium',
        category: 'Regulatory Risk',
        description:
          'Changes in local zoning laws or property taxes could impact rental yields. However, the property is compliant with all current regulations.',
      },
    ],
    audit: {
      auditor: 'KPMG India',
      auditDate: '2024-12-01',
      status: 'completed',
      findings:
        'Property valuation confirmed at market rate. All legal documents verified and in order. No material issues found.',
      reportUrl: 'https://example.com/audit-report-001.pdf',
    },
    createdAt: '2025-01-10',
    updatedAt: '2025-12-20',
  },
  {
    id: '2',
    name: 'Green Energy Solar Farm',
    assetType: 'Renewable Energy',
    status: 'LISTED',
    location: 'Rajasthan, India',
    overview:
      'Large-scale solar energy facility with 50MW capacity. The farm supplies clean energy to the regional grid with long-term power purchase agreements in place.',
    tokenDistribution: {
      totalTokens: 2000,
      soldTokens: 1500,
      unsoldTokens: 500,
      claimableTokens: 500,
      tokenPrice: 50,
    },
    invoice: {
      invoiceNumber: 'INV-2025-002',
      amount: 150000,
      dueDate: '2025-07-15',
      issueDate: '2025-01-20',
      description:
        'Quarterly power generation revenue from solar farm operations. Includes grid connection fees and renewable energy credits.',
      paymentTerms: 'Net 45',
    },
    riskFactors: [
      {
        level: 'low',
        category: 'Operational Risk',
        description:
          'Solar panels are from tier-1 manufacturers with 25-year performance warranties. Maintenance contracts in place.',
      },
      {
        level: 'medium',
        category: 'Weather Risk',
        description:
          'Solar energy production is dependent on weather conditions. However, Rajasthan receives abundant sunshine year-round.',
      },
      {
        level: 'low',
        category: 'Credit Risk',
        description:
          'Power purchase agreement is with state electricity board, providing stable revenue stream.',
      },
    ],
    audit: {
      auditor: 'Deloitte Energy & Resources',
      auditDate: '2024-11-15',
      status: 'completed',
      findings:
        'Solar farm operating at expected efficiency levels. All equipment inspections passed. Revenue projections are conservative and achievable.',
    },
    createdAt: '2025-01-15',
    updatedAt: '2025-12-21',
  },
  {
    id: '3',
    name: 'Luxury Resort in Goa',
    assetType: 'Hospitality',
    status: 'SETTLED',
    location: 'North Goa, India',
    overview:
      'Beachfront luxury resort featuring 100 rooms, spa facilities, multiple restaurants, and conference halls. Popular destination for weddings and corporate events.',
    tokenDistribution: {
      totalTokens: 500,
      soldTokens: 500,
      unsoldTokens: 0,
      claimableTokens: 0,
      tokenPrice: 200,
    },
    invoice: {
      invoiceNumber: 'INV-2025-003',
      amount: 200000,
      dueDate: '2025-05-30',
      issueDate: '2025-01-05',
      description:
        'Monthly revenue from resort operations including room bookings, F&B services, spa treatments, and event hosting.',
      paymentTerms: 'Net 30',
    },
    riskFactors: [
      {
        level: 'medium',
        category: 'Seasonal Risk',
        description:
          'Tourism in Goa is seasonal with peak season from October to March. Off-season occupancy rates may be lower.',
      },
      {
        level: 'low',
        category: 'Brand Risk',
        description:
          'Resort has established strong reputation with consistent 4.5+ ratings on major booking platforms.',
      },
    ],
    audit: {
      auditor: 'EY Hospitality',
      auditDate: '2024-10-20',
      status: 'completed',
      findings:
        'Financial statements verified. Occupancy rates align with market standards. Property maintenance is excellent.',
    },
    createdAt: '2025-01-01',
    updatedAt: '2025-12-18',
  },
  {
    id: '4',
    name: 'Tech Park Bangalore',
    assetType: 'Commercial Real Estate',
    status: 'UPLOADED',
    location: 'Bangalore, Karnataka, India',
    overview:
      'Modern IT park with Grade A office spaces. Designed for technology companies with high-speed connectivity, backup power, and advanced security systems.',
    tokenDistribution: {
      totalTokens: 1000,
      soldTokens: 0,
      unsoldTokens: 1000,
      claimableTokens: 1000,
      tokenPrice: 75,
    },
    invoice: {
      invoiceNumber: 'INV-2025-004',
      amount: 120000,
      dueDate: '2025-08-30',
      issueDate: '2025-02-01',
      description:
        'Pre-lease agreements with tech companies. Payment pending completion of construction and occupancy permits.',
      paymentTerms: 'Net 60',
    },
    riskFactors: [
      {
        level: 'high',
        category: 'Construction Risk',
        description:
          'Property is currently under construction. Delays in completion could impact lease commencement dates.',
      },
      {
        level: 'medium',
        category: 'Tenant Risk',
        description:
          'While pre-lease agreements are in place, tenant occupancy is subject to market conditions.',
      },
    ],
    audit: {
      auditor: 'PwC Real Estate',
      auditDate: '2024-12-10',
      status: 'in_progress',
      findings: 'Construction progress on schedule. Environmental clearances obtained. Financial projections under review.',
    },
    createdAt: '2025-02-01',
    updatedAt: '2025-12-22',
  },
  {
    id: '5',
    name: 'Residential Complex Delhi',
    assetType: 'Real Estate',
    status: 'REGISTERED',
    location: 'New Delhi, India',
    overview:
      'Upscale residential complex with 200 apartments. Features include clubhouse, swimming pool, gym, and landscaped gardens. Located in prime residential area.',
    tokenDistribution: {
      totalTokens: 800,
      soldTokens: 650,
      unsoldTokens: 150,
      claimableTokens: 150,
      tokenPrice: 120,
    },
    invoice: {
      invoiceNumber: 'INV-2025-005',
      amount: 180000,
      dueDate: '2025-09-15',
      issueDate: '2025-01-25',
      description:
        'Monthly maintenance charges and rental income from residential units. Includes common area maintenance and amenity charges.',
      paymentTerms: 'Net 30',
    },
    riskFactors: [
      {
        level: 'low',
        category: 'Location Risk',
        description:
          'Property is located in established residential area with excellent connectivity and infrastructure.',
      },
      {
        level: 'medium',
        category: 'Maintenance Risk',
        description:
          'Older buildings require ongoing maintenance. Reserve fund is maintained for major repairs.',
      },
    ],
    createdAt: '2025-01-20',
    updatedAt: '2025-12-19',
  },
];

export const getAssetById = (id: string): any | undefined => {
  return mockAssets.find((asset) => asset.id === id);
};
