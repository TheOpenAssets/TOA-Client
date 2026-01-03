// src/pages/admin/operations/OperationsView.page.tsx

import { useState, useEffect } from 'react';
import {
  Network,
  Layers,
  CheckCircle2,
  FileCode,
  Hash,
  Loader2,
} from 'lucide-react';
import { useAdminStore, type AdminAsset } from '../../../stores/admin.store';
import { adminService } from '../../../lib/api/admin.service';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/toast';

const OperationsViewPage = () => {
  const {
    assetsForOperations,
    fetchAdminDashboardData,
    isLoading,
    error
  } = useAdminStore();
  const { toasts, success, error: showError, info, removeToast } = useToast();

  const [selectedAsset, setSelectedAsset] = useState<AdminAsset | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showTokenizeModal, setShowTokenizeModal] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const [showAuctionSchedulingModal, setShowAuctionSchedulingModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tokenSymbol, setTokenSymbol] = useState('');

  // Listing form data
  const [listingType] = useState('STATIC');
  const [price] = useState('1000000'); // 1 USDC in 6 decimals
  const [minInvestment, setMinInvestment] = useState(''); // Will be populated from asset data
  const [duration] = useState('0');

  // Auction scheduling form data
  const [startDelayMinutes, setStartDelayMinutes] = useState('5'); // 5 minutes default (matches script)

  // Mock on-chain data
  const [mockBlobId, setMockBlobId] = useState('');
  const [mockAttestationHash, setMockAttestationHash] = useState('');
  const [mockTokenAddress, setMockTokenAddress] = useState('');

  useEffect(() => {
    fetchAdminDashboardData();
    const style = document.createElement('style');
    style.innerHTML = `
      /* Hide scrollbar for Chrome, Safari and Opera */
      ::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      
      /* Hide scrollbar for IE, Edge and Firefox */
      * {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
      
      /* Ensure scrolling still works */
      html, body {
        overflow: auto;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [fetchAdminDashboardData]);

  // Stage filter state
  const [stageFilter, setStageFilter] = useState<'all' | 1 | 2 | 3>('all');

  // Combine all assets with their stage information
  type AssetWithStage = AdminAsset & { stage: 1 | 2 | 3; stageName: string };

  const allAssets: AssetWithStage[] = assetsForOperations
    .filter((asset) => {
      // Step 1: Register on Mantle - ATTESTED assets
      if (asset.status === 'ATTESTED') return true;
      // Step 2: Deploy Token - REGISTERED assets
      if (asset.status === 'REGISTERED') return true;
      // Step 3: List on Marketplace - TOKENIZED/SCHEDULED assets NOT already listed
      if ((asset.status === 'TOKENIZED' || asset.status === 'SCHEDULED') && !asset.listing?.active) return true;
      return false;
    })
    .map((asset) => {
      let stage: 1 | 2 | 3;
      let stageName: string;

      if (asset.status === 'ATTESTED') {
        stage = 1;
        stageName = 'Register';
      } else if (asset.status === 'REGISTERED') {
        stage = 2;
        stageName = 'Deploy Token';
      } else {
        stage = 3;
        stageName = 'List';
      }

      return { ...asset, stage, stageName };
    });

  // Filter by stage
  const filteredAssets = stageFilter === 'all'
    ? allAssets
    : allAssets.filter(asset => asset.stage === stageFilter);

  // Count assets per stage
  const stage1Count = allAssets.filter(a => a.stage === 1).length;
  const stage2Count = allAssets.filter(a => a.stage === 2).length;
  const stage3Count = allAssets.filter(a => a.stage === 3).length;

  // Handle Register
  const handleRegister = (asset: AdminAsset) => {
    setSelectedAsset(asset);
    // Generate mock on-chain data
    setMockBlobId(`0xblob_${Math.random().toString(36).substring(2, 15)}`);
    setMockAttestationHash(`0xattest_${Math.random().toString(36).substring(2, 15)}`);
    setShowRegisterModal(true);
  };

  const confirmRegister = async () => {
    if (!selectedAsset) {
      console.error('No asset selected');
      return;
    }

    console.log('🔨 Registering asset:', selectedAsset.assetId);
    setProcessing(true);

    try {
      const result = await adminService.registerAsset(selectedAsset.assetId);
      console.log('✅ Registration API response:', result);

      // Refresh dashboard data
      await fetchAdminDashboardData();

      // Close modal
      setShowRegisterModal(false);
      setSelectedAsset(null);

      // Show appropriate message
      if (result.alreadyRegistered) {
        info(
          'Asset Already Registered',
          'This asset was already registered on-chain.\n\nNote: If it\'s still showing in Step 1, there may be a backend data sync issue. Please refresh the page.',
          8000
        );
      } else {
        success('Registration Successful!', 'Asset has been successfully registered on Mantle blockchain.');
      }
    } catch (error: any) {
      console.error('❌ Failed to register asset:', error);
      showError('Registration Failed', error.message || 'An error occurred while registering the asset.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Tokenize
  const handleTokenize = (asset: AdminAsset) => {
    setSelectedAsset(asset);
    setMockTokenAddress(`0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`);
    // Initialize token symbol with auto-generated value or empty string
    const autoGeneratedSymbol = asset.metadata.invoiceNumber.replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setTokenSymbol(autoGeneratedSymbol);
    setShowTokenizeModal(true);
  };

  const confirmTokenize = async () => {
    if (!selectedAsset) return;

    // Validate token symbol
    if (!tokenSymbol || tokenSymbol.trim() === '') {
      showError('Invalid Token Symbol', 'Please enter a valid token symbol.');
      return;
    }

    setProcessing(true);
    try {
      const tokenName = `Invoice ${selectedAsset.metadata.invoiceNumber} RWA Token`;

      console.log('🔨 Deploying token for:', selectedAsset.assetId);
      console.log('Token Symbol:', tokenSymbol);
      const result = await adminService.deployToken(selectedAsset.assetId, tokenName, tokenSymbol);
      console.log('✅ Token deployment response:', result);

      await fetchAdminDashboardData();
      setShowTokenizeModal(false);
      setSelectedAsset(null);

      // Show appropriate message
      if (result.alreadyDeployed) {
        info(
          'Token Already Deployed',
          'Token was already deployed for this asset.\n\nNote: If it\'s still showing in Step 2, there may be a backend data sync issue. Please refresh the page.',
          8000
        );
      } else {
        success('Token Deployed!', 'ERC-3643 compliant token has been successfully deployed on Mantle.');
      }
    } catch (error: any) {
      console.error('❌ Failed to deploy token:', error);
      showError('Deployment Failed', error.message || 'An error occurred while deploying the token.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle List on Marketplace
  const handleListOnMarketplace = (asset: AdminAsset) => {
    setSelectedAsset(asset);

    // Populate form with asset's data from backend
    if (asset.tokenParams?.minInvestment) {
      setMinInvestment(asset.tokenParams.minInvestment);
      console.log('📝 Using minInvestment from asset:', asset.tokenParams.minInvestment);
    } else {
      // Fallback to default if not set
      setMinInvestment('1000000000000000000000');
      console.warn('⚠️  Asset has no minInvestment, using default');
    }

    // Check if asset is AUCTION type
    if (asset.assetType === 'AUCTION' || asset.listing?.type === 'AUCTION') {
      console.log('🔨 Opening auction scheduling modal for:', asset.assetId);
      setShowAuctionSchedulingModal(true);
    } else {
      console.log('📋 Opening static listing modal for:', asset.assetId);
      setShowListingModal(true);
    }
  };

  const confirmListing = async () => {
    if (!selectedAsset) return;
    setProcessing(true);
    try {
      // Step 1: List asset on marketplace (Backend API call)
      console.log('🔨 Step 1: Listing asset on marketplace...');
      await adminService.listOnMarketplace(
        selectedAsset.assetId,
        listingType,
        price,
        minInvestment,
        duration
      );
      console.log('✅ Asset listed on marketplace successfully');

      // Step 2: Approve marketplace to spend RWA tokens (ADMIN executes ON-CHAIN transaction)
      // Admin wallet directly calls: RWAToken.approve(PrimaryMarketplace, MaxUint256)
      // PrimaryMarketplace: 0x034Ca27695555CEeB44CB62d59c4E3f95F4Ef504
      console.log('🔨 Step 2: Admin executing ON-CHAIN marketplace approval...');

      try {
        const approvalResult = await adminService.approveMarketplaceForAsset(selectedAsset.assetId);

        if (!approvalResult.success) {
          throw new Error(approvalResult.error || 'Approval failed');
        }

        console.log('✅ Marketplace approval successful');
        console.log('Transaction Hash:', approvalResult.transactionHash);
        success(
          'Listed & Approved!',
          `Asset is now available on the marketplace.\n\nApproval confirmed!\nTx: ${approvalResult.transactionHash?.slice(0, 10)}...\n\nView on explorer: ${approvalResult.explorerUrl}`,
          10000
        );
      } catch (approvalError: any) {
        console.error('⚠️ Marketplace approval failed:', approvalError);
        info(
          'Listed (Approval Warning)',
          `Asset is listed on marketplace, but approval failed: ${approvalError.message}`,
          10000
        );
      }

      // Refresh dashboard and close modal
      await fetchAdminDashboardData();
      setShowListingModal(false);
      setSelectedAsset(null);
    } catch (error: any) {
      console.error('❌ Failed to list asset:', error);
      showError('Listing Failed', error.message || 'An error occurred while listing the asset.');
    } finally {
      setProcessing(false);
    }
  };

  const confirmAuctionScheduling = async () => {
    if (!selectedAsset) return;
    setProcessing(true);

    try {
      // Step 1: Schedule auction (Backend API call)
      console.log('🔨 Step 1: Scheduling auction for:', selectedAsset.assetId);
      console.log('⏱ Start delay:', startDelayMinutes, 'minutes');

      const response = await adminService.scheduleAuction(
        selectedAsset.assetId,
        parseInt(startDelayMinutes)
      );

      console.log('✅ Auction scheduled successfully:', response);
      console.log('📅 Scheduled start time:', response.scheduledStartTime);
      console.log('📄 Message:', response.message);

      // Step 2: Approve marketplace to spend RWA tokens (ADMIN executes ON-CHAIN transaction)
      // Admin wallet directly calls: RWAToken.approve(PrimaryMarketplace, MaxUint256)
      console.log('🔨 Step 2: Admin executing ON-CHAIN marketplace approval...');

      try {
        const approvalResult = await adminService.approveMarketplaceForAsset(selectedAsset.assetId);

        if (!approvalResult.success) {
          throw new Error(approvalResult.error || 'Approval failed');
        }

        console.log('✅ Marketplace approval successful');
        console.log('Transaction Hash:', approvalResult.transactionHash);
        success(
          'Auction Scheduled & Approved!',
          `${response.message}\n\nScheduled Start: ${new Date(response.scheduledStartTime).toLocaleString()}\n\nApproval confirmed!\nTx: ${approvalResult.transactionHash?.slice(0, 10)}...\n\nView on explorer: ${approvalResult.explorerUrl}`,
          12000
        );

      } catch (approvalError: any) {
        console.error('⚠️ Marketplace approval failed:', approvalError);
        info(
          'Auction Scheduled (Approval Warning)',
          `${response.message}\n\nScheduled Start: ${new Date(response.scheduledStartTime).toLocaleString()}\n\nApproval failed: ${approvalError.message}`,
          12000
        );
      }

      // Refresh dashboard and close modal
      await fetchAdminDashboardData();
      setShowAuctionSchedulingModal(false);
      setSelectedAsset(null);
    } catch (error: any) {
      console.error('❌ Failed to schedule auction:', error);
      showError('Scheduling Failed', error.message || 'An error occurred while scheduling the auction.');
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <div className="font-gellix text-lg text-foreground">Loading operations...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="font-gellix text-lg text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => fetchAdminDashboardData()}
            className="px-6 py-2 bg-black text-white rounded-xl font-gellix text-sm font-medium hover:bg-black/90 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="font-gellix text-3xl font-semibold text-foreground mb-2">
            On-Chain Operations Center
          </h2>
          <p className="font-gellix text-sm text-foreground/70">
            Register assets on Mantle and deploy ERC-3643 tokens
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Network className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-gellix text-xs text-gray-500 uppercase tracking-wide mb-1">Total Assets</p>
                <p className="font-gellix text-2xl font-semibold text-foreground">
                  {allAssets.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Layers className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-gellix text-xs text-gray-500 uppercase tracking-wide mb-1">Register</p>
                <p className="font-gellix text-2xl font-semibold text-foreground">
                  {stage1Count}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Network className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-gellix text-xs text-gray-500 uppercase tracking-wide mb-1">Deploy</p>
                <p className="font-gellix text-2xl font-semibold text-foreground">
                  {stage2Count}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-gellix text-xs text-gray-500 uppercase tracking-wide mb-1">List</p>
                <p className="font-gellix text-2xl font-semibold text-foreground">
                  {stage3Count}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-row justify-between gap-2">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-colors ${stageFilter === 'all'
              ? 'bg-gray-100 text-black'
              : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            All Assets ({allAssets.length})

          </button>
          <div className='border border-gray-200 rounded-xl p-1'>
            <button
              onClick={() => setStageFilter(1)}
              className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-colors ${stageFilter === 1
                ? 'bg-gray-100 text-black'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              Register ({stage1Count})
            </button>
            <button
              onClick={() => setStageFilter(2)}
              className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-colors ${stageFilter === 2
                ? 'bg-gray-100 text-black'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              Deploy ({stage2Count})
            </button>
            <button
              onClick={() => setStageFilter(3)}
              className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-colors ${stageFilter === 3
                ? 'bg-gray-100 text-black'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              List ({stage3Count})
            </button>
          </div>
        </div>

        {/* Assets Table */}
        {filteredAssets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-t border-gray-200">
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Face Value
                  </th>
                  <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token Supply
                  </th>
                  <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stage
                  </th>
                  <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset, index) => (
                  <tr
                    key={asset.assetId}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                  >
                    {/* Invoice Number */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                          📄
                        </div>
                        <div>
                          <div className="font-gellix text-sm font-semibold text-foreground">
                            {asset.metadata.invoiceNumber}
                          </div>
                          {asset.assetType === 'AUCTION' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              🔨 Auction
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="px-6 py-4">
                      <div className="font-gellix text-sm text-foreground">
                        {asset.metadata.industry}
                      </div>
                      <div className="font-gellix text-xs text-gray-500">
                        {asset.metadata.buyerName}
                      </div>
                    </td>

                    {/* Face Value */}
                    <td className="px-6 py-4 text-right">
                      <div className="font-gellix text-sm font-semibold text-foreground">
                        {asset.metadata.currency} {parseFloat(asset.metadata.faceValue).toLocaleString()}
                      </div>
                    </td>

                    {/* Token Supply */}
                    <td className="px-6 py-4 text-right">
                      <div className="font-gellix text-sm text-foreground">
                        {(parseFloat(asset.tokenParams.totalSupply) / 1e18).toLocaleString()}
                      </div>
                      <div className="font-gellix text-xs text-gray-500">
                        @ ${(parseFloat(asset.tokenParams.pricePerToken) / 1e6).toFixed(2)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${asset.status === 'ATTESTED' ? 'bg-gray-100 text-gray-700' :
                        asset.status === 'REGISTERED' ? 'bg-purple-50 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                        {asset.status}
                      </span>
                    </td>

                    {/* Current Stage */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-gellix text-sm font-bold ${asset.stage === 1 ? 'bg-gray-200 text-gray-700' :
                          asset.stage === 2 ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                          {asset.stage}
                        </div>
                        <div className="font-gellix text-xs text-gray-500">
                          {asset.stageName}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {asset.stage === 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegister(asset);
                            }}
                            className="px-4 py-2 text-gray-700 font-gellix text-sm font-bold hover:text-gray-900 hover:scale-[1.05] transition-all border border-gray-300 rounded-2xl hover:border-gray-400 ."
                          >
                            Register
                          </button>
                        )}
                        {asset.stage === 2 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTokenize(asset);
                            }}
                            className="px-4 py-2 text-purple-600 font-gellix text-sm font-bold hover:text-purple-700 hover:scale-[1.05] border border-gray-300 rounded-2xl transition-all"
                          >
                            Deploy
                          </button>
                        )}
                        {asset.stage === 3 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleListOnMarketplace(asset);
                            }}
                            className="px-4 py-2 text-gray-700  font-gellix text-sm font-bold hover:text-gray-900 hover:scale-[1.05] border border-gray-300 rounded-2xl transition-all"
                          >
                            {asset.assetType === 'AUCTION' ? 'Schedule' : 'List'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Network className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="font-gellix text-lg font-semibold text-foreground mb-2">
              {stageFilter === 'all' ? 'No Assets Ready' : `No Assets in Stage ${stageFilter}`}
            </h3>
            <p className="font-gellix text-sm text-foreground/60">
              {stageFilter === 'all'
                ? 'Assets must be compliance-approved before they can be registered on-chain'
                : `Switch to "All Assets" to view assets in other stages`
              }
            </p>
          </div>
        )}

        {/* Register Modal */}
        {showRegisterModal && selectedAsset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-gellix text-2xl font-semibold text-foreground">
                  Register Asset on Mantle
                </h3>
              </div>

              <p className="font-gellix text-sm text-foreground/70 mb-6">
                This will register the asset on Mantle blockchain with BlobID and attestation hash.
              </p>

              {/* Asset Details */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
                <h4 className="font-gellix text-sm font-semibold text-foreground mb-3">Asset Details</h4>
                <div className="grid grid-cols-2 gap-4 font-gellix text-sm">
                  <div>
                    <span className="text-foreground/60">Invoice Number:</span>
                    <p className="text-foreground font-semibold mt-1">{selectedAsset.metadata.invoiceNumber}</p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Industry:</span>
                    <p className="text-foreground font-semibold mt-1">{selectedAsset.metadata.industry}</p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Total Value:</span>
                    <p className="text-foreground font-semibold mt-1">{selectedAsset.metadata.currency} {parseFloat(selectedAsset.metadata.faceValue).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Buyer:</span>
                    <p className="text-foreground font-semibold mt-1">{selectedAsset.metadata.buyerName}</p>
                  </div>
                </div>
              </div>

              {/* On-Chain Data Preview */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-3">
                <h4 className="font-gellix text-sm font-semibold text-foreground mb-3">
                  On-Chain Data (Preview)
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Hash className="w-4 h-4 text-foreground/50 mt-1" />
                    <div className="flex-1">
                      <span className="font-gellix text-xs text-foreground/60">BlobID:</span>
                      <p className="font-mono text-xs text-foreground break-all">{mockBlobId}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Hash className="w-4 h-4 text-foreground/50 mt-1" />
                    <div className="flex-1">
                      <span className="font-gellix text-xs text-foreground/60">Attestation Hash:</span>
                      <p className="font-mono text-xs text-foreground break-all">{mockAttestationHash}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Network className="w-4 h-4 text-foreground/50 mt-1" />
                    <div className="flex-1">
                      <span className="font-gellix text-xs text-foreground/60">Registry Contract:</span>
                      <p className="font-mono text-xs text-foreground">0x1234...7890</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={confirmRegister}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-black hover:bg-black/90 text-white shadow-sm"
                >
                  {processing ? 'Registering on Mantle...' : 'Confirm Registration'}
                </Button>
                <Button
                  onClick={() => {
                    setShowRegisterModal(false);
                    setSelectedAsset(null);
                  }}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tokenize Modal */}
        {showTokenizeModal && selectedAsset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Network className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-gellix text-2xl font-semibold text-foreground">
                  Deploy ERC-3643 Token
                </h3>
              </div>

              <p className="font-gellix text-sm text-foreground/70 mb-6">
                This will deploy a compliant ERC-3643 security token for the asset.
              </p>

              {/* Token Details */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
                <h4 className="font-gellix text-sm font-semibold text-foreground mb-3">Token Configuration</h4>
                <div className="grid grid-cols-2 gap-4 font-gellix text-sm">
                  <div>
                    <span className="text-foreground/60">Token Name:</span>
                    <p className="text-foreground font-semibold mt-1">Invoice {selectedAsset.metadata.invoiceNumber} RWA Token</p>
                  </div>
                  <div>
                    <label className="block">
                      <span className="text-foreground/60">Token Symbol: <span className="text-red-500">*</span></span>
                      <input
                        type="text"
                        value={tokenSymbol}
                        onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                        placeholder="e.g., INVTEST"
                        maxLength={11}
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg font-gellix text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </label>
                    <p className="text-xs text-foreground/50 mt-1">Max 11 characters, uppercase</p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Total Supply:</span>
                    <p className="text-foreground font-semibold mt-1">{(parseFloat(selectedAsset.tokenParams.totalSupply) / 1e18).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Token Standard:</span>
                    <p className="text-foreground font-semibold mt-1">ERC-3643</p>
                  </div>
                </div>
              </div>

              {/* Deployment Preview */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-3">
                <h4 className="font-gellix text-sm font-semibold text-foreground mb-3">
                  Deployment Details
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Network className="w-4 h-4 text-foreground/50 mt-1" />
                    <div className="flex-1">
                      <span className="font-gellix text-xs text-foreground/60">Network:</span>
                      <p className="font-gellix text-xs text-foreground font-semibold">Mantle Network</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Hash className="w-4 h-4 text-foreground/50 mt-1" />
                    <div className="flex-1">
                      <span className="font-gellix text-xs text-foreground/60">Token Address (Preview):</span>
                      <p className="font-mono text-xs text-foreground break-all">{mockTokenAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileCode className="w-4 h-4 text-foreground/50 mt-1" />
                    <div className="flex-1">
                      <span className="font-gellix text-xs text-foreground/60">Contract Type:</span>
                      <p className="font-gellix text-xs text-foreground font-semibold">ERC-3643 Compliant Security Token</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={confirmTokenize}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-black hover:bg-black/90 text-white shadow-sm"
                >
                  {processing ? 'Deploying Token...' : 'Deploy Token Contract'}
                </Button>
                <Button
                  onClick={() => {
                    setShowTokenizeModal(false);
                    setSelectedAsset(null);
                  }}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Auction Scheduling Modal */}
        {showAuctionSchedulingModal && selectedAsset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-gellix text-2xl font-semibold text-foreground">
                  Schedule Auction
                </h3>
              </div>

              <p className="font-gellix text-sm text-foreground/70 mb-6">
                Schedule a Dutch auction for this asset. The auction will start at the specified time and run for the selected duration.
              </p>

              {/* Asset Details */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
                <h4 className="font-gellix text-sm font-semibold text-foreground mb-3">Asset Details</h4>
                <div className="grid grid-cols-2 gap-4 font-gellix text-sm">
                  <div>
                    <span className="text-foreground/60">Invoice Number:</span>
                    <p className="text-foreground font-semibold mt-1">{selectedAsset.metadata.invoiceNumber}</p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Token Address:</span>
                    <p className="font-mono text-xs text-foreground mt-1">
                      {selectedAsset.token?.address ? `${selectedAsset.token.address.slice(0, 10)}...${selectedAsset.token.address.slice(-8)}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Total Supply:</span>
                    <p className="text-foreground font-semibold mt-1">
                      {(parseFloat(selectedAsset.tokenParams.totalSupply) / 1e18).toLocaleString()} tokens
                    </p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Reserve Price:</span>
                    <p className="text-foreground font-semibold mt-1">
                      ${(parseFloat(selectedAsset.listing?.reservePrice || '800000') / 1e6).toFixed(2)} USDC
                    </p>
                  </div>
                </div>
              </div>

              {/* Auction Configuration */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
                <h4 className="font-gellix text-sm font-semibold text-foreground mb-3">
                  Auction Scheduling
                </h4>

                <div>
                  <label className="block font-gellix text-sm font-medium text-foreground mb-2">
                    Start Delay (minutes from now)
                  </label>
                  <select
                    value={startDelayMinutes}
                    onChange={(e) => setStartDelayMinutes(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 font-gellix text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1 minute (testing)</option>
                    <option value="5">5 minutes - Recommended</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                  </select>
                  <p className="font-gellix text-xs text-foreground/60 mt-1">
                    Auction will start automatically after this delay
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-gellix text-xs text-blue-800">
                    <strong>How it works:</strong> The auction will be scheduled to start in {startDelayMinutes} minute{startDelayMinutes !== '1' ? 's' : ''}.
                    At the scheduled time, the system will:
                  </p>
                  <ul className="font-gellix text-xs text-blue-800 mt-2 ml-4 list-disc">
                    <li>Activate the auction on-chain</li>
                    <li>Create an AUCTION_LIVE announcement</li>
                    <li>Allow investors to start submitting bids</li>
                  </ul>
                  <p className="font-gellix text-xs text-blue-800 mt-2">
                    The auction will run for 15 minutes (configured in asset settings).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={confirmAuctionScheduling}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-black hover:bg-black/90 text-white shadow-sm"
                >
                  {processing ? 'Scheduling Auction...' : 'Schedule Auction'}
                </Button>
                <Button
                  onClick={() => {
                    setShowAuctionSchedulingModal(false);
                    setSelectedAsset(null);
                  }}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* List on Marketplace Modal */}
        {showListingModal && selectedAsset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-gellix text-2xl font-semibold text-foreground">
                  List Asset on Marketplace
                </h3>
              </div>

              <p className="font-gellix text-sm text-foreground/70 mb-6">
                Configure listing parameters to make this asset available for investors on the primary marketplace.
              </p>

              {/* Asset Details */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
                <h4 className="font-gellix text-sm font-semibold text-foreground mb-3">Asset Details</h4>
                <div className="grid grid-cols-2 gap-4 font-gellix text-sm">
                  <div>
                    <span className="text-foreground/60">Invoice Number:</span>
                    <p className="text-foreground font-semibold mt-1">{selectedAsset.metadata.invoiceNumber}</p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Token Address:</span>
                    <p className="font-mono text-xs text-foreground mt-1">
                      {selectedAsset.token?.address ? `${selectedAsset.token.address.slice(0, 10)}...${selectedAsset.token.address.slice(-8)}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Total Supply:</span>
                    <p className="text-foreground font-semibold mt-1">
                      {(parseFloat(selectedAsset.tokenParams.totalSupply) / 1e18).toLocaleString()} tokens
                    </p>
                  </div>
                  <div>
                    <span className="text-foreground/60">Token Symbol:</span>
                    <p className="text-foreground font-semibold mt-1">{selectedAsset.token?.symbol || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Listing Configuration */}


              <div className="flex gap-3">
                <Button
                  onClick={confirmListing}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-black hover:bg-black/90 text-white shadow-sm"
                >
                  {processing ? 'Listing on Marketplace...' : 'Confirm Listing'}
                </Button>
                <Button
                  onClick={() => {
                    setShowListingModal(false);
                    setSelectedAsset(null);
                  }}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div >
    </>
  );
};

export default OperationsViewPage;
