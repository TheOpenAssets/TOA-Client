// src/pages/admin/settlements/SettlementView.page.tsx

import { useState, useEffect } from 'react';
import {
  Coins,
  TrendingUp,
  Calendar,
  DollarSign,
  ExternalLink,
  Check,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { useAdminStore, type AdminAsset } from '../../../stores/admin.store';
import { adminService } from '../../../lib/api/admin.service';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { PageLoader } from '../../../components/ui/page-loader';

// Step definitions matching admin-yeild.sh
type SettlementStep =
  | 'VERIFY_ASSET'          // Step 1: Verify asset is PAYOUT_COMPLETE
  | 'RECORD_SETTLEMENT'     // Step 2: Record settlement with platform fee
  | 'CONFIRM_USDC'          // Step 3: Confirm USDC conversion
  | 'DISTRIBUTE'            // Step 4: Execute on-chain distribution
  | 'COMPLETE';             // Step 5: Show results

interface Settlement {
  _id: string;
  assetId: string;
  settlementAmount: number;
  platformFee: number;
  netDistribution: number;
  usdcAmount?: string;
  status: string;
  createdAt: string;
  distributionResults?: {
    totalDistributed: string;
    holders: number;
    totalTokenDays: string;
    effectiveYield: string;
  };
}

const SettlementViewPage = () => {
  const { assetsForSettlement: payoutCompleteAssets, isLoading, error, fetchAdminDashboardData } = useAdminStore();

  // Modal state
  const [selectedAsset, setSelectedAsset] = useState<AdminAsset | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<SettlementStep>('VERIFY_ASSET');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Settlement data
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [settlementId, setSettlementId] = useState<string>('');
  const [platformFee, setPlatformFee] = useState<number>(0);
  const [netDistribution, setNetDistribution] = useState<number>(0);
  const [usdcAmount, setUsdcAmount] = useState<string>('');
  const [distributionResults, setDistributionResults] = useState<any>(null);

  // Settlements list
  const [allSettlements, setAllSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    fetchAdminDashboardData();
    // fetchAllSettlements();
  }, [fetchAdminDashboardData]);

  const fetchAllSettlements = async () => {
    try {
      const settlements = await adminService.getAllSettlements();
      setAllSettlements(settlements);
    } catch (err) {
      console.error('Failed to fetch settlements:', err);
    }
  };

  // Format currency
  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '$0';
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatUSDC = (amountWei: string): string => {
    const amount = parseFloat(amountWei) / 1e6;
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  // Handle start settlement flow
  const handleStartSettlement = (asset: AdminAsset) => {
    setSelectedAsset(asset);
    setCurrentStep('VERIFY_ASSET');
    setSettlementAmount(0);
    setSettlementDate(new Date().toISOString().split('T')[0]);
    setSettlementId('');
    setPlatformFee(0);
    setNetDistribution(0);
    setUsdcAmount('');
    setDistributionResults(null);
    setErrorMessage(null);
    setShowSettlementModal(true);
  };

  // Step 2: Record Settlement
  const handleRecordSettlement = async () => {
    if (settlementAmount <= 0) {
      setErrorMessage('Please enter a valid settlement amount');
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      const result = await adminService.recordYieldSettlement(
        selectedAsset!.assetId,
        settlementAmount,
        settlementDate
      );

      console.log('Settlement recorded:', result);

      setSettlementId(result._id || result.settlementId || '');
      setPlatformFee(result.platformFee);
      setNetDistribution(result.netDistribution);

      // Calculate USDC amount (6 decimals)
      const usdcWei = Math.floor(result.netDistribution * 1e6).toString();
      setUsdcAmount(usdcWei);

      setCurrentStep('CONFIRM_USDC');
    } catch (err: any) {
      console.error('Failed to record settlement:', err);
      setErrorMessage(err.message || 'Failed to record settlement');
    } finally {
      setProcessing(false);
    }
  };

  // Step 3: Confirm USDC Conversion
  const handleConfirmUSDC = async () => {
    setProcessing(true);
    setErrorMessage(null);

    try {
      const result = await adminService.confirmUSDCConversion(settlementId, usdcAmount);

      console.log('USDC conversion confirmed:', result);

      if (result.status === 'READY_FOR_DISTRIBUTION') {
        setCurrentStep('DISTRIBUTE');
      } else {
        setErrorMessage(`Unexpected status: ${result.status}`);
      }
    } catch (err: any) {
      console.error('Failed to confirm USDC:', err);
      setErrorMessage(err.message || 'Failed to confirm USDC conversion');
    } finally {
      setProcessing(false);
    }
  };

  // Step 4: Distribute Yield On-Chain
  const handleDistributeYield = async () => {
    setProcessing(true);
    setErrorMessage(null);

    try {
      const result = await adminService.distributeYield(settlementId);

      console.log('Yield distributed:', result);

      setDistributionResults(result);
      setCurrentStep('COMPLETE');

      // Refresh settlements list
      await fetchAllSettlements();
      await fetchAdminDashboardData();
    } catch (err: any) {
      console.error('Failed to distribute yield:', err);
      setErrorMessage(err.message || 'Failed to distribute yield');
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setShowSettlementModal(false);
    setSelectedAsset(null);
    setCurrentStep('VERIFY_ASSET');
    setErrorMessage(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <PageLoader text="Loading Settlements..." />
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-gellix text-2xl font-semibold text-foreground mb-2">
          Settlements & Yield Manager
        </h2>
        <p className="font-gellix text-sm text-gray-500">
          Record settlements and distribute yield to token holders (time-weighted)
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-xl">
              <Coins className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-gellix text-xs text-gray-500 uppercase tracking-wide mb-1">Ready for Yield</p>
              <p className="font-gellix text-2xl font-semibold text-foreground">
                {payoutCompleteAssets?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-gellix text-xs text-gray-500 uppercase tracking-wide mb-1">Total Settlements</p>
              <p className="font-gellix text-2xl font-semibold text-foreground">
                {allSettlements.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-gellix text-xs text-gray-500 uppercase tracking-wide mb-1">Total Distributed</p>
              <p className="font-gellix text-2xl font-semibold text-foreground">
                {formatCurrency(
                  allSettlements
                    .filter(s => s.status === 'DISTRIBUTED')
                    .reduce((sum, s) => sum + s.netDistribution, 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Ready for Yield Distribution */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-gellix text-xl font-semibold text-foreground mb-1">
            Assets Ready for Yield Distribution
          </h3>
          <p className="font-gellix text-sm text-gray-500">
            Assets with completed payout status can receive yield settlements
          </p>
        </div>

        {!payoutCompleteAssets || payoutCompleteAssets.length === 0 ? (
          <div className="p-12 text-center">
            <Coins className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="font-gellix text-lg font-semibold text-foreground mb-2">
              No Assets Ready
            </h3>
            <p className="font-gellix text-sm text-gray-500">
              Assets must have its originator paid out before yield can be distributed
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-t border-gray-200">
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry & Buyer
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
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {payoutCompleteAssets.map((asset, index) => (
                  <>
                    <tr
                      key={asset.assetId}
                      className={`border-b border-gray-100 transition-all cursor-pointer ${expandedRow === asset.assetId ? 'bg-gray-50' : index % 2 === 0 ? 'bg-white hover:bg-gray-50/50' : 'bg-gray-50/30 hover:bg-gray-50'
                        }`}
                      onClick={() => setExpandedRow(expandedRow === asset.assetId ? null : asset.assetId)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                            📄
                          </div>
                          <span className="font-gellix text-sm font-semibold text-foreground">
                            {asset.metadata.invoiceNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-gellix text-sm text-foreground font-medium">
                            {asset.metadata.industry}
                          </p>
                          <p className="font-gellix text-xs text-gray-500">
                            {asset.metadata.buyerName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-gellix text-sm font-semibold text-foreground">
                          {asset.metadata.currency} {parseFloat(asset.metadata.faceValue).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-gellix text-sm font-semibold text-foreground">
                          {(parseFloat(asset.tokenParams.totalSupply) / 1e18).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${asset.status === 'PAYOUT_COMPLETE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                          }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartSettlement(asset);
                          }}
                          className="px-4 py-2 bg-black text-white rounded-lg font-gellix text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                          Record Settlement
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedRow === asset.assetId && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <p className="font-gellix text-xs text-gray-500 mb-1">Token Address</p>
                              <p className="font-mono text-xs text-foreground">
                                {asset.token?.address ? `${asset.token.address.slice(0, 16)}...${asset.token.address.slice(-16)}` : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="font-gellix text-xs text-gray-500 mb-1">Token Symbol</p>
                              <p className="font-gellix text-xs font-semibold text-foreground">
                                {asset.token?.symbol || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="font-gellix text-xs text-gray-500 mb-1">Blockchain Explorer</p>
                              {asset.token?.address ? (
                                <a
                                  href={`https://sepolia.mantlescan.xyz/address/${asset.token.address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-gray-700 hover:text-gray-900 text-xs transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View on Mantlescan
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">Not deployed</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Settlements Table */}
      {allSettlements.length > 0 && (
        <div
          className="rounded-2xl p-8 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="mb-6">
            <h3 className="font-geist text-2xl font-normal text-foreground mb-1">
              All Settlements
            </h3>
            <p className="font-inter text-sm text-foreground/70">
              View all recorded yield settlements and their distribution status
            </p>
          </div>

          <div className="bg-white rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-geist">
                    Settlement Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-geist">
                    Asset ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-geist">
                    Settlement Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-geist">
                    Platform Fee (1.5%)
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-geist">
                    Net Distribution
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-geist">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allSettlements.map((settlement) => (
                  <tr key={settlement._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-inter text-sm text-foreground">
                        {new Date(settlement.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-mono text-xs text-foreground">
                        {settlement.assetId.slice(0, 8)}...
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-geist text-sm font-semibold text-foreground">
                        ${settlement.settlementAmount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-geist text-sm text-red-600">
                        -${settlement.platformFee.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-geist text-sm font-semibold text-green-600">
                        ${settlement.netDistribution.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${settlement.status === 'DISTRIBUTED'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : settlement.status === 'READY_FOR_DISTRIBUTION'
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          }`}
                      >
                        {settlement.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settlement Modal - Multi-Step Flow */}
      {showSettlementModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <Coins className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-gellix text-xl font-semibold text-foreground">
                  Yield Settlement
                </h3>
                <p className="font-gellix text-sm text-gray-500">
                  Invoice #{selectedAsset.metadata.invoiceNumber}
                </p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
              {[
                { key: 'VERIFY_ASSET', label: 'Verify' },
                { key: 'RECORD_SETTLEMENT', label: 'Record' },
                { key: 'CONFIRM_USDC', label: 'Confirm USDC' },
                { key: 'DISTRIBUTE', label: 'Distribute' },
                { key: 'COMPLETE', label: 'Complete' },
              ].map((step, index) => (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-gellix text-sm font-semibold ${currentStep === step.key
                        ? 'bg-blue-600 text-white'
                        : ['VERIFY_ASSET', 'RECORD_SETTLEMENT', 'CONFIRM_USDC', 'DISTRIBUTE', 'COMPLETE'].indexOf(currentStep) >
                          ['VERIFY_ASSET', 'RECORD_SETTLEMENT', 'CONFIRM_USDC', 'DISTRIBUTE', 'COMPLETE'].indexOf(step.key as SettlementStep)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                        }`}
                    >
                      {['VERIFY_ASSET', 'RECORD_SETTLEMENT', 'CONFIRM_USDC', 'DISTRIBUTE', 'COMPLETE'].indexOf(currentStep) >
                        ['VERIFY_ASSET', 'RECORD_SETTLEMENT', 'CONFIRM_USDC', 'DISTRIBUTE', 'COMPLETE'].indexOf(step.key as SettlementStep) ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <p className="font-inter text-xs text-foreground/60 mt-2">{step.label}</p>
                  </div>
                  {index < 4 && <ChevronRight className="w-5 h-5 text-gray-400 -mx-2" />}
                </div>
              ))}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-inter text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Step 1: Verify Asset */}
            {currentStep === 'VERIFY_ASSET' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6">
                  <h4 className="font-geist text-lg font-semibold text-foreground mb-4">
                    Asset Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 font-inter text-sm">
                    <div>
                      <span className="text-foreground/60">Invoice Number:</span>
                      <p className="text-foreground font-medium mt-1">{selectedAsset.metadata.invoiceNumber}</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Status:</span>
                      <p className="text-foreground font-medium mt-1">{selectedAsset.status}</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Face Value:</span>
                      <p className="text-foreground font-medium mt-1">
                        {selectedAsset.metadata.currency} {parseFloat(selectedAsset.metadata.faceValue).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Token Address:</span>
                      <p className="font-mono text-xs text-foreground font-medium mt-1">
                        {selectedAsset.token?.address ? `${selectedAsset.token.address.slice(0, 10)}...${selectedAsset.token.address.slice(-8)}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-inter text-sm text-blue-900 font-semibold mb-1">
                        Asset Ready for Yield Distribution
                      </p>
                      <p className="font-inter text-xs text-blue-700">
                        This asset is in completed payout status and can receive yield settlements.
                        Platform fee of 1.5% will be deducted from the settlement amount.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setCurrentStep('RECORD_SETTLEMENT')}
                    className="flex-1 font-inter font-medium rounded-2xl bg-black text-white hover:bg-gray-800 hover:scale-105 transition-all duration-200"
                  >
                    Continue to Record Settlement
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    onClick={closeModal}
                    className="flex-1 font-inter font-medium rounded-xl bg-gray-200 hover:bg-gray-300 text-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Record Settlement */}
            {currentStep === 'RECORD_SETTLEMENT' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block font-inter text-sm font-medium text-foreground mb-2">
                      Settlement Amount (USD)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                      <Input
                        type="number"
                        placeholder="100000"
                        value={settlementAmount || ''}
                        onChange={(e) => setSettlementAmount(parseFloat(e.target.value) || 0)}
                        className="pl-10 font-inter rounded-xl"
                      />
                    </div>
                    <p className="font-inter text-xs text-foreground/60 mt-1">
                      Enter the face value paid by the originator (e.g., 100000 for $100k)
                    </p>
                  </div>

                  <div>
                    <label className="block font-inter text-sm font-medium text-foreground mb-2">
                      Settlement Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                      <Input
                        type="date"
                        value={settlementDate}
                        onChange={(e) => setSettlementDate(e.target.value)}
                        className="pl-10 font-inter rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Platform Fee Preview */}
                {settlementAmount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-inter text-sm font-semibold text-blue-900">
                        Distribution Preview
                      </span>
                    </div>
                    <div className="space-y-2 font-inter text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600">Settlement Amount:</span>
                        <span className="text-blue-700 font-medium">
                          ${settlementAmount.toLocaleString()} USD
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Platform Fee (1.5%):</span>
                        <span className="text-red-400 font-medium">
                          -${(settlementAmount * 0.015).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </span>
                      </div>
                      <div className="border-t border-blue-300 pt-2 flex justify-between">
                        <span className="text-blue-700 font-semibold">Net Distribution:</span>
                        <span className="text-green-600 font-semibold">
                          ${(settlementAmount * 0.985).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleRecordSettlement}
                    disabled={processing || settlementAmount <= 0}
                    className="flex-1 font-inter font-medium rounded-2xl bg-black text-white hover:bg-gray-800 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Recording Settlement...
                      </>
                    ) : (
                      <>
                        Record Settlement
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={closeModal}
                    disabled={processing}
                    className="flex-1 font-inter font-medium rounded-xl bg-gray-200 hover:bg-gray-300 text-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirm USDC Conversion */}
            {currentStep === 'CONFIRM_USDC' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6">
                  <h4 className="font-geist text-lg font-semibold text-foreground mb-4">
                    Settlement Recorded Successfully
                  </h4>
                  <div className="grid grid-cols-2 gap-4 font-inter text-sm">
                    <div>
                      <span className="text-foreground/60">Settlement ID:</span>
                      <p className="font-mono text-xs text-foreground font-medium mt-1">{settlementId}</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Settlement Amount:</span>
                      <p className="text-foreground font-medium mt-1">${settlementAmount.toLocaleString()} USD</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Platform Fee (1.5%):</span>
                      <p className="text-red-600 font-medium mt-1">${platformFee.toLocaleString()} USD</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Net Distribution:</span>
                      <p className="text-green-600 font-semibold mt-1">${netDistribution.toLocaleString()} USD</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="font-inter text-sm font-semibold text-blue-900">
                      USDC Conversion (1 USD = 1 USDC)
                    </span>
                  </div>
                  <div className="space-y-2 font-inter text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Net Distribution:</span>
                      <span className="text-blue-900 font-medium">${netDistribution.toLocaleString()} USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">USDC Amount:</span>
                      <span className="text-blue-900 font-medium">{formatUSDC(usdcAmount)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">USDC Wei (6 decimals):</span>
                      <span className="font-mono text-xs text-blue-900">{usdcAmount}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleConfirmUSDC}
                    disabled={processing}
                    className="flex-1 font-inter font-medium rounded-2xl bg-black text-white hover:bg-gray-800 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        Confirm USDC Conversion
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={closeModal}
                    disabled={processing}
                    className="flex-1 font-inter font-medium rounded-xl bg-gray-200 hover:bg-gray-300 text-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Distribute On-Chain */}
            {currentStep === 'DISTRIBUTE' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6">
                  <h4 className="font-geist text-lg font-semibold text-foreground mb-4">
                    Ready for On-Chain Distribution
                  </h4>
                  <div className="grid grid-cols-2 gap-4 font-inter text-sm mb-4">
                    <div>
                      <span className="text-foreground/60">Settlement ID:</span>
                      <p className="font-mono text-xs text-foreground font-medium mt-1">{settlementId}</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">USDC Amount:</span>
                      <p className="text-foreground font-medium mt-1">{formatUSDC(usdcAmount)} USDC</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-inter text-sm text-yellow-900 font-semibold mb-1">
                        This will execute blockchain transactions!
                      </p>
                      <ul className="font-inter text-xs text-yellow-700 space-y-1 mt-2">
                        <li>• USDC approval to YieldVault</li>
                        <li>• Deposit USDC to YieldVault</li>
                        <li>• Distribute to all token holders (time-weighted)</li>
                      </ul>
                      <p className="font-inter text-xs text-yellow-700 mt-2">
                        This may take 30-60 seconds to complete.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleDistributeYield}
                    disabled={processing}
                    className="flex-1 font-inter font-medium rounded-2xl bg-black text-white hover:bg-gray-800 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Distributing Yield... (30-60s)
                      </>
                    ) : (
                      <>
                        Execute On-Chain Distribution
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={closeModal}
                    disabled={processing}
                    className="flex-1 font-inter font-medium rounded-xl bg-gray-200 hover:bg-gray-300 text-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Complete - Show Results */}
            {currentStep === 'COMPLETE' && distributionResults && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-geist text-xl font-semibold text-green-900">
                        Yield Distribution Complete!
                      </h4>
                      <p className="font-inter text-sm text-green-700">
                        {distributionResults.message}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-inter text-sm text-blue-900 font-semibold mb-1">
                        What happens next:
                      </p>
                      <ol className="font-inter text-xs text-blue-700 space-y-1 mt-2 list-decimal list-inside">
                        <li>Investors can now claim their USDC yield</li>
                        <li>Each investor calls claimAllYield() on YieldVault</li>
                        <li>USDC is transferred to investor's wallet</li>
                      </ol>
                      <p className="font-inter text-xs text-blue-700 mt-3">
                        <strong>Verify on-chain:</strong> YieldVault.getUserClaimable(holderAddress)
                      </p>
                      {selectedAsset.token?.address && (
                        <p className="font-inter text-xs text-blue-700 mt-1">
                          <strong>Token Address:</strong>{' '}
                          <span className="font-mono">{selectedAsset.token.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={closeModal}
                    className="flex-1 font-inter font-medium rounded-2xl bg-black text-white hover:bg-gray-800 hover:scale-105 transition-all duration-200"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementViewPage;
