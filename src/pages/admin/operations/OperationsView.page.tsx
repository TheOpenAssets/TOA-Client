// src/pages/admin/operations/OperationsView.page.tsx

import { useState, useEffect } from 'react';
import {
  Network,
  Layers,
  CheckCircle2,
  ExternalLink,
  FileCode,
  Hash,
  ChevronRight,
} from 'lucide-react';
import { useAdminStore, type AdminAsset } from '../../../stores/admin.store';
import { adminService } from '../../../lib/api/admin.service';
import { contractService } from '../../../lib/api/contract.service';
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
  }, [fetchAdminDashboardData]);

  // Split assets based on STATUS (not checkpoints!)
  // Step 1: Register on Mantle - show ATTESTED assets
  const attestedAssets = assetsForOperations.filter(
    (asset) => asset.status === 'ATTESTED'
  );

  // Step 2: Deploy Token - show REGISTERED assets
  const registeredAssets = assetsForOperations.filter(
    (asset) => asset.status === 'REGISTERED'
  );

  // Step 3: List on Marketplace - show TOKENIZED assets that are NOT already listed
  const tokenizedAssets = assetsForOperations.filter(
    (asset) => (asset.status === 'TOKENIZED' || asset.status ==='SCHEDULED') && !asset.listing?.active
  );

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
    setShowTokenizeModal(true);
  };

  const confirmTokenize = async () => {
    if (!selectedAsset) return;
    setProcessing(true);
    try {
      const tokenName = `Invoice ${selectedAsset.metadata.invoiceNumber} RWA Token`;
      const tokenSymbol = selectedAsset.metadata.invoiceNumber.replace(/[^A-Z0-9]/g, '').slice(0, 6);

      console.log('🔨 Deploying token for:', selectedAsset.assetId);
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
      // PrimaryMarketplace: 0x96183D507Bbb0dA7d78192dce7FBC8C1f209061C
      console.log('🔨 Step 2: Admin executing ON-CHAIN marketplace approval...');

      // Get token address from selected asset
      const tokenAddress = selectedAsset.token?.address;

      if (!tokenAddress) {
        console.warn('⚠️ No token address found, skipping approval');
        info(
          'Listed Successfully!',
          'Asset is listed on marketplace.\n\nWarning: No token address found. Please approve marketplace manually.',
          8000
        );
        await fetchAdminDashboardData();
        setShowListingModal(false);
        setSelectedAsset(null);
        return;
      }

      try {
        const approvalResult = await contractService.approveMarketplaceForRWAToken(tokenAddress);

        if (!approvalResult.success) {
          throw new Error(approvalResult.error || 'Approval failed');
        }

        if (approvalResult.alreadyApproved) {
          console.log('ℹ️ Marketplace was already approved on-chain');
          info(
            'Listed Successfully!',
            'Asset is now available on the marketplace.\n\nNote: Marketplace approval was already set on-chain.',
            6000
          );
        } else {
          console.log('✅ ON-CHAIN marketplace approval successful');
          console.log('Transaction Hash:', approvalResult.transactionHash);
          console.log('Block Number:', approvalResult.blockNumber);
          success(
            'Listed & Approved!',
            `Asset is now available on the marketplace.\n\nON-CHAIN approval confirmed!\nTx: ${approvalResult.transactionHash?.slice(0, 10)}...\n\nView on explorer: https://explorer.sepolia.mantle.xyz/tx/${approvalResult.transactionHash}`,
            10000
          );
        }
      } catch (approvalError: any) {
        console.error('⚠️ ON-CHAIN marketplace approval failed (non-critical):', approvalError);
        // Show warning but don't fail the entire operation
        info(
          'Listed (Approval Warning)',
          `Asset is listed on marketplace, but ON-CHAIN approval failed: ${approvalError.message}\n\nPlease approve marketplace manually using your admin wallet.`,
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
      console.log('🔨 Scheduling auction for:', selectedAsset.assetId);
      console.log('⏱ Start delay:', startDelayMinutes, 'minutes');

      // Call scheduling API (admin-approve.sh Step 6)
      const response = await adminService.scheduleAuction(
        selectedAsset.assetId,
        parseInt(startDelayMinutes)
      );

      console.log('✅ Auction scheduled successfully:', response);
      console.log('📅 Scheduled start time:', response.scheduledStartTime);
      console.log('📄 Message:', response.message);

      await fetchAdminDashboardData();
      setShowAuctionSchedulingModal(false);
      setSelectedAsset(null);

      success(
        'Auction Scheduled!',
        `${response.message}\n\nScheduled Start: ${new Date(response.scheduledStartTime).toLocaleString()}`,
        8000
      );
    } catch (error: any) {
      console.error('❌ Failed to schedule auction:', error);
      showError('Scheduling Failed', error.message || 'An error occurred while scheduling the auction.');
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return <div>Loading operations...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-antic text-3xl font-normal text-foreground mb-2">
          On-Chain Operations Center
        </h2>
        <p className="font-inter text-sm text-foreground/70">
          Register assets on Mantle and deploy ERC-3643 tokens
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Ready for Registry</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {attestedAssets.length}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <Network className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Ready for Tokenization</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {registeredAssets.length}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Tokenized Assets</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {tokenizedAssets.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 1: Assets Ready for Registry */}
      {attestedAssets.length > 0 && (
        <div
          className="rounded-2xl p-8 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Step 1: Register on Mantle
              </h3>
            </div>
            <p className="font-inter text-sm text-foreground/70">
              Assets approved and ready for on-chain registration
            </p>
          </div>

          <div className="space-y-4">
            {attestedAssets.map((asset) => (
              <div
                key={asset.assetId}
                className="bg-white rounded-xl p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <FileCode className="w-6 h-6 text-foreground/60" />
                      </div>
                      <div>
                        <h4 className="font-antic text-lg font-normal text-foreground">
                          Invoice #{asset.metadata.invoiceNumber}
                        </h4>
                        <p className="font-inter text-xs text-foreground/60">
                          {asset.metadata.industry}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Total Value</p>
                        <p className="font-antic text-base font-normal text-foreground">
                          {asset.metadata.currency} {parseFloat(asset.metadata.faceValue).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Total Tokens</p>
                        <p className="font-antic text-base font-normal text-foreground">
                          {(parseFloat(asset.tokenParams.totalSupply) / 1e18).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Buyer</p>
                        <p className="font-inter text-sm font-medium text-foreground">
                          {asset.metadata.buyerName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleRegister(asset)}
                    className="font-inter font-medium rounded-xl whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                      boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                    }}
                  >
                    Register on Mantle
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 2: Registered Assets Ready for Tokenization */}
      {registeredAssets.length > 0 && (
        <div
          className="rounded-2xl p-8 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Network className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Step 2: Deploy ERC-3643 Token
              </h3>
            </div>
            <p className="font-inter text-sm text-foreground/70">
              Assets registered on Mantle, ready for tokenization
            </p>
          </div>

          <div className="space-y-4">
            {registeredAssets.map((asset) => (
              <div
                key={asset.assetId}
                className="bg-white rounded-xl p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <FileCode className="w-6 h-6 text-foreground/60" />
                      </div>
                      <div>
                        <h4 className="font-antic text-lg font-normal text-foreground">
                          Invoice #{asset.metadata.invoiceNumber}
                        </h4>
                        <p className="font-inter text-xs text-foreground/60">
                          {asset.metadata.industry}
                        </p>
                      </div>
                    </div>

                    {/* Registry Data */}
                    <div className="bg-gray-50 rounded-lg p-4 mt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-foreground/50" />
                        <span className="font-inter text-xs text-foreground/60">Transaction Hash:</span>
                        <span className="font-mono text-xs text-foreground">
                          {asset.registry?.transactionHash ? `${asset.registry.transactionHash.slice(0, 10)}...${asset.registry.transactionHash.slice(-8)}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-foreground/50" />
                        <span className="font-inter text-xs text-foreground/60">Block Number:</span>
                        <span className="font-mono text-xs text-foreground">
                          {asset.registry?.blockNumber || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Total Supply</p>
                        <p className="font-antic text-base font-normal text-foreground">
                          {(parseFloat(asset.tokenParams.totalSupply) / 1e18).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Token Price</p>
                        <p className="font-antic text-base font-normal text-foreground">
                          ${parseFloat(asset.tokenParams.pricePerToken).toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Standard</p>
                        <p className="font-inter text-sm font-medium text-foreground">
                          ERC-3643
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleTokenize(asset)}
                    className="font-inter font-medium rounded-xl whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                      boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                    }}
                  >
                    Deploy Token
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tokenized Assets Overview */}
      {tokenizedAssets.length > 0 && (
        <div
          className="rounded-2xl p-8 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Step 3: List on Marketplace
              </h3>
            </div>
            <p className="font-inter text-sm text-foreground/70">
              Tokenized assets ready for marketplace listing
            </p>
          </div>

          <div className="space-y-4">
            {tokenizedAssets.map((asset) => (
              <div
                key={asset.assetId}
                className="bg-white rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-antic text-lg font-normal text-foreground">
                            Invoice #{asset.metadata.invoiceNumber}
                          </h4>
                          {asset.assetType === 'AUCTION' && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                              🔨 AUCTION
                            </span>
                          )}
                          {asset.assetType === 'STATIC' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              📊 STATIC
                            </span>
                          )}
                        </div>
                        <p className="font-inter text-xs text-foreground/60">
                          {asset.metadata.industry}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-foreground/60">Token Address:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-foreground">
                            {asset.token?.address ? `${asset.token.address.slice(0, 10)}...${asset.token.address.slice(-8)}` : 'N/A'}
                          </span>
                          {asset.token?.address && (
                            <a
                              href={`https://explorer.sepolia.mantle.xyz/address/${asset.token.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-foreground/60">Symbol:</span>
                        <span className="font-inter text-xs font-medium text-foreground">
                          {asset.token?.symbol || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-foreground/60">Total Supply:</span>
                        <span className="font-inter text-xs font-medium text-foreground">
                          {(parseFloat(asset.tokenParams.totalSupply) / 1e18).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-foreground/60">
                          {asset.assetType === 'AUCTION' ? 'Auction Status:' : 'Listing Status:'}
                        </span>
                        <span className={`font-inter text-xs font-medium ${asset.listing?.active ? 'text-green-600' : 'text-orange-600'}`}>
                          {asset.listing?.active ? '✓ Listed' : 'Not Listed'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!asset.listing?.active && (
                    <Button
                      onClick={() => handleListOnMarketplace(asset)}
                      className="font-inter font-medium rounded-xl whitespace-nowrap"
                      style={{
                        background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                        boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                      }}
                    >
                      {asset.assetType === 'AUCTION' ? 'Schedule Auction' : 'List on Marketplace'}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                  {asset.listing?.active && (
                    <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-inter text-sm font-medium">
                      ✓ Active on Marketplace
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {attestedAssets.length === 0 && registeredAssets.length === 0 && tokenizedAssets.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <Network className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-antic text-lg font-semibold text-foreground mb-2">
            No Assets Ready
          </h3>
          <p className="font-inter text-sm text-foreground/60">
            Assets must be compliance-approved before they can be registered on-chain
          </p>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Layers className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Register Asset on Mantle
              </h3>
            </div>

            <p className="font-inter text-sm text-foreground/70 mb-6">
              This will register the asset on Mantle blockchain with BlobID and attestation hash.
            </p>

            {/* Asset Details */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-4">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">Asset Details</h4>
              <div className="grid grid-cols-2 gap-4 font-inter text-sm">
                <div>
                  <span className="text-foreground/60">Invoice Number:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.metadata.invoiceNumber}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Industry:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.metadata.industry}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Total Value:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.metadata.currency} {parseFloat(selectedAsset.metadata.faceValue).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Buyer:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.metadata.buyerName}</p>
                </div>
              </div>
            </div>

            {/* On-Chain Data Preview */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-3">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">
                On-Chain Data (Preview)
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Hash className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">BlobID:</span>
                    <p className="font-mono text-xs text-foreground break-all">{mockBlobId}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Hash className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">Attestation Hash:</span>
                    <p className="font-mono text-xs text-foreground break-all">{mockAttestationHash}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Network className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">Registry Contract:</span>
                    <p className="font-mono text-xs text-foreground">0x1234...7890</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmRegister}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                  boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                }}
              >
                {processing ? 'Registering on Mantle...' : 'Confirm Registration'}
              </Button>
              <Button
                onClick={() => {
                  setShowRegisterModal(false);
                  setSelectedAsset(null);
                }}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl bg-gray-200 hover:bg-gray-300 text-foreground"
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
          <div
            className="rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Network className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Deploy ERC-3643 Token
              </h3>
            </div>

            <p className="font-inter text-sm text-foreground/70 mb-6">
              This will deploy a compliant ERC-3643 security token for the asset.
            </p>

            {/* Token Details */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-4">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">Token Configuration</h4>
              <div className="grid grid-cols-2 gap-4 font-inter text-sm">
                <div>
                  <span className="text-foreground/60">Token Name:</span>
                  <p className="text-foreground font-medium mt-1">Invoice {selectedAsset.metadata.invoiceNumber} RWA Token</p>
                </div>
                <div>
                  <span className="text-foreground/60">Token Symbol:</span>
                  <p className="text-foreground font-medium mt-1">
                    {selectedAsset.metadata.invoiceNumber.replace(/[^A-Z0-9]/g, '').slice(0, 6)}
                  </p>
                </div>
                <div>
                  <span className="text-foreground/60">Total Supply:</span>
                  <p className="text-foreground font-medium mt-1">{(parseFloat(selectedAsset.tokenParams.totalSupply) / 1e18).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Token Standard:</span>
                  <p className="text-foreground font-medium mt-1">ERC-3643</p>
                </div>
              </div>
            </div>

            {/* Deployment Preview */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-3">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">
                Deployment Details
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Network className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">Network:</span>
                    <p className="font-inter text-xs text-foreground font-medium">Mantle Network</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Hash className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">Token Address (Preview):</span>
                    <p className="font-mono text-xs text-foreground break-all">{mockTokenAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileCode className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">Contract Type:</span>
                    <p className="font-inter text-xs text-foreground font-medium">ERC-3643 Compliant Security Token</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmTokenize}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                  boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                }}
              >
                {processing ? 'Deploying Token...' : 'Deploy Token Contract'}
              </Button>
              <Button
                onClick={() => {
                  setShowTokenizeModal(false);
                  setSelectedAsset(null);
                }}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl bg-gray-200 hover:bg-gray-300 text-foreground"
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
          <div
            className="rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Layers className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Schedule Auction
              </h3>
            </div>

            <p className="font-inter text-sm text-foreground/70 mb-6">
              Schedule a Dutch auction for this asset. The auction will start at the specified time and run for the selected duration.
            </p>

            {/* Asset Details */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-4">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">Asset Details</h4>
              <div className="grid grid-cols-2 gap-4 font-inter text-sm">
                <div>
                  <span className="text-foreground/60">Invoice Number:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.metadata.invoiceNumber}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Token Address:</span>
                  <p className="font-mono text-xs text-foreground mt-1">
                    {selectedAsset.token?.address ? `${selectedAsset.token.address.slice(0, 10)}...${selectedAsset.token.address.slice(-8)}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-foreground/60">Total Supply:</span>
                  <p className="text-foreground font-medium mt-1">
                    {(parseFloat(selectedAsset.tokenParams.totalSupply) / 1e18).toLocaleString()} tokens
                  </p>
                </div>
                <div>
                  <span className="text-foreground/60">Reserve Price:</span>
                  <p className="text-foreground font-medium mt-1">
                    ${(parseFloat(selectedAsset.listing?.reservePrice || '800000') / 1e6).toFixed(2)} USDC
                  </p>
                </div>
              </div>
            </div>

            {/* Auction Configuration */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-4">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">
                Auction Scheduling
              </h4>

              <div>
                <label className="block font-inter text-sm font-medium text-foreground mb-2">
                  Start Delay (minutes from now)
                </label>
                <select
                  value={startDelayMinutes}
                  onChange={(e) => setStartDelayMinutes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 font-inter text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="1">1 minute (testing)</option>
                  <option value="5">5 minutes - Recommended</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </select>
                <p className="font-inter text-xs text-foreground/60 mt-1">
                  Auction will start automatically after this delay
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-inter text-xs text-blue-800">
                  <strong>How it works:</strong> The auction will be scheduled to start in {startDelayMinutes} minute{startDelayMinutes !== '1' ? 's' : ''}.
                  At the scheduled time, the system will:
                </p>
                <ul className="font-inter text-xs text-blue-800 mt-2 ml-4 list-disc">
                  <li>Activate the auction on-chain</li>
                  <li>Create an AUCTION_LIVE announcement</li>
                  <li>Allow investors to start submitting bids</li>
                </ul>
                <p className="font-inter text-xs text-blue-800 mt-2">
                  The auction will run for 15 minutes (configured in asset settings).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmAuctionScheduling}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                  boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                }}
              >
                {processing ? 'Scheduling Auction...' : 'Schedule Auction'}
              </Button>
              <Button
                onClick={() => {
                  setShowAuctionSchedulingModal(false);
                  setSelectedAsset(null);
                }}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl bg-gray-200 hover:bg-gray-300 text-foreground"
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
          <div
            className="rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Layers className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                List Asset on Marketplace
              </h3>
            </div>

            <p className="font-inter text-sm text-foreground/70 mb-6">
              Configure listing parameters to make this asset available for investors on the primary marketplace.
            </p>

            {/* Asset Details */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-4">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">Asset Details</h4>
              <div className="grid grid-cols-2 gap-4 font-inter text-sm">
                <div>
                  <span className="text-foreground/60">Invoice Number:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.metadata.invoiceNumber}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Token Address:</span>
                  <p className="font-mono text-xs text-foreground mt-1">
                    {selectedAsset.token?.address ? `${selectedAsset.token.address.slice(0, 10)}...${selectedAsset.token.address.slice(-8)}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-foreground/60">Total Supply:</span>
                  <p className="text-foreground font-medium mt-1">
                    {(parseFloat(selectedAsset.tokenParams.totalSupply) / 1e18).toLocaleString()} tokens
                  </p>
                </div>
                <div>
                  <span className="text-foreground/60">Token Symbol:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.token?.symbol || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Listing Configuration */}
            

            <div className="flex gap-3">
              <Button
                onClick={confirmListing}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                  boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                }}
              >
                {processing ? 'Listing on Marketplace...' : 'Confirm Listing'}
              </Button>
              <Button
                onClick={() => {
                  setShowListingModal(false);
                  setSelectedAsset(null);
                }}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl bg-gray-200 hover:bg-gray-300 text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default OperationsViewPage;
