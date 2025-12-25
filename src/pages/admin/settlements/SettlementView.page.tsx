// src/pages/admin/settlements/SettlementView.page.tsx

import { useState, useEffect } from 'react';
import {
  Coins,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle2,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { useAdminStore, type AdminAsset } from '../../../stores/admin.store';
import { adminService } from '../../../lib/api/admin.service';
import type { SettlementFormData } from '../../../types/admin.types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

const SettlementViewPage = () => {
  const { assetsForSettlement: yieldingAssets, isLoading, error, fetchAdminDashboardData } = useAdminStore();

  const [selectedAsset, setSelectedAsset] = useState<AdminAsset | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState<SettlementFormData>({
    assetId: '',
    fiatAmount: 0,
    currency: 'USD',
    settlementDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchAdminDashboardData();
  }, [fetchAdminDashboardData]);

  // Format currency with null safety
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

  // Handle Record Settlement
  const handleRecordSettlement = (asset: AdminAsset) => {
    setSelectedAsset(asset);
    setFormData({
      assetId: asset.id,
      fiatAmount: 0,
      currency: 'USD',
      settlementDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowSettlementModal(true);
  };

  const confirmSettlement = async () => {
    if (formData.fiatAmount <= 0) {
      alert('Please enter a valid settlement amount');
      return;
    }

    setProcessing(true);
    try {
      await adminService.recordSettlement(formData);
      fetchAdminDashboardData();
      setShowSettlementModal(false);
      setSelectedAsset(null);
    } catch (error) {
      console.error('Failed to record settlement', error);
    } finally {
      setProcessing(false);
    }
  };

  // Calculate total yield distributed with null safety
  const totalYieldDistributed = yieldingAssets?.reduce(
    (sum, asset) => sum + (asset?.yield?.totalDistributed || 0),
    0
  ) || 0;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f8ffe6]">
        <div className="text-lg font-antic text-foreground">Loading settlements...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f8ffe6]">
        <div className="text-lg text-red-600 font-antic">Error: {error}</div>
      </div>
    );
  }

  if (!yieldingAssets || yieldingAssets.length === 0) {
    return (
      <div className="min-h-screen bg-[#f0f8ffe6] p-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-antic text-3xl font-normal text-foreground mb-6">
            Settlements & Yield Manager
          </h2>
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <Coins className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="font-antic text-lg font-semibold text-foreground mb-2">
              No Active Assets
            </h3>
            <p className="font-inter text-sm text-foreground/60">
              Assets must be tokenized before they can receive yield distributions
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-antic text-3xl font-normal text-foreground mb-2">
          Settlements & Yield Manager
        </h2>
        <p className="font-inter text-sm text-foreground/70">
          Record settlements and distribute yield to token holders
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
            <Coins className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Active Assets</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {yieldingAssets.length}
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
            <TrendingUp className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Total Yield Distributed</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {formatCurrency(totalYieldDistributed)}
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
            <DollarSign className="w-5 h-5 text-purple-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Total Settlements</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {yieldingAssets.reduce((sum, a) => sum + (a.yield?.settlements?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Assets */}
      <div
        className="rounded-2xl p-8 shadow-lg"
        style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
      >
        <div className="mb-6">
          <h3 className="font-antic text-2xl font-normal text-foreground mb-1">
            Active Tokenized Assets
          </h3>
          <p className="font-inter text-sm text-foreground/70">
            Assets ready for yield distribution
          </p>
        </div>

        <div className="space-y-6">
          {yieldingAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Coins className="w-6 h-6 text-foreground/60" />
                    </div>
                    <div>
                      <h4 className="font-antic text-lg font-normal text-foreground">
                        {asset.name}
                      </h4>
                      <p className="font-inter text-xs text-foreground/60">
                        {asset.assetType}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="font-inter text-xs text-foreground/60 mb-1">Total Value</p>
                      <p className="font-antic text-base font-normal text-foreground">
                        {formatCurrency(asset.totalValue)}
                      </p>
                    </div>
                    <div>
                      <p className="font-inter text-xs text-foreground/60 mb-1">Total Supply</p>
                      <p className="font-antic text-base font-normal text-foreground">
                        {asset.totalTokens.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-inter text-xs text-foreground/60 mb-1">Yield Distributed</p>
                      <p className="font-antic text-base font-normal text-green-600">
                        {formatCurrency(asset.yield?.totalDistributed || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="font-inter text-xs text-foreground/60 mb-1">Frequency</p>
                      <p className="font-inter text-sm font-medium text-foreground">
                        {asset.yield?.distributionFrequency || 'MONTHLY'}
                      </p>
                    </div>
                  </div>

                  {/* Token Info */}
                  {asset.tokenization && (
                    <div className="bg-gray-50 rounded-lg p-4 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-inter text-xs text-foreground/60">Token:</span>
                          <span className="font-mono text-xs text-foreground">
                            {asset.tokenization.tokenAddress?.slice(0, 10)}...
                            {asset.tokenization.tokenAddress?.slice(-8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-inter text-xs text-foreground/60">Symbol:</span>
                          <span className="font-inter text-xs font-medium text-foreground">
                            {asset.tokenization.tokenSymbol}
                          </span>
                        </div>
                        <a
                          href={asset.tokenization.tokenExplorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-inter text-xs"
                        >
                          View on Explorer
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleRecordSettlement(asset)}
                  className="font-inter font-medium rounded-xl whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                    boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Record Settlement
                </Button>
              </div>

              {/* Settlement History */}
              {asset.yield && asset.yield.settlements.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h5 className="font-inter text-sm font-semibold text-foreground mb-3">
                    Settlement History
                  </h5>
                  <div className="space-y-2">
                    {asset.yield.settlements.map((settlement) => (
                      <div
                        key={settlement.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-inter text-sm font-medium text-foreground">
                              {formatCurrency(settlement.fiatAmount)} {settlement.currency} → {formatCurrency(settlement.usdcAmount)} USDC
                            </p>
                            <p className="font-inter text-xs text-foreground/60">
                              {new Date(settlement.settlementDate).toLocaleDateString()} • By {settlement.recordedBy}
                            </p>
                          </div>
                        </div>
                        {settlement.transactionHash && (
                          <a
                            href={`https://explorer.mantle.xyz/tx/${settlement.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Distribution */}
              {asset.yield?.nextDistributionDate && (
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="flex items-center gap-2 text-foreground/60">
                    <Calendar className="w-4 h-4" />
                    <span className="font-inter text-xs">
                      Next Distribution: {new Date(asset.yield.nextDistributionDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {yieldingAssets.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <Coins className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-antic text-lg font-semibold text-foreground mb-2">
            No Active Assets
          </h3>
          <p className="font-inter text-sm text-foreground/60">
            Assets must be tokenized before they can receive yield distributions
          </p>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettlementModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Coins className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Record Settlement
              </h3>
            </div>

            <p className="font-inter text-sm text-foreground/70 mb-6">
              Record a fiat settlement and distribute yield to token holders as USDC.
            </p>

            {/* Asset Info */}
            <div className="bg-white rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 font-inter text-sm">
                <div>
                  <span className="text-foreground/60">Asset:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.name}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Token Symbol:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.tokenization?.tokenSymbol}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Total Holders:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.totalTokens.toLocaleString()} tokens</p>
                </div>
                <div>
                  <span className="text-foreground/60">Previous Distribution:</span>
                  <p className="text-foreground font-medium mt-1">
                    {formatCurrency(selectedAsset.yield?.totalDistributed || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Settlement Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block font-inter text-sm font-medium text-foreground mb-2">
                  Fiat Amount Received
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.fiatAmount || ''}
                    onChange={(e) => setFormData({ ...formData, fiatAmount: parseFloat(e.target.value) || 0 })}
                    className="pl-10 font-inter rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-inter text-sm font-medium text-foreground mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 font-inter text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div>
                <label className="block font-inter text-sm font-medium text-foreground mb-2">
                  Settlement Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                  <Input
                    type="date"
                    value={formData.settlementDate}
                    onChange={(e) => setFormData({ ...formData, settlementDate: e.target.value })}
                    className="pl-10 font-inter rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-inter text-sm font-medium text-foreground mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g., Q1 2025 rental income, interest payment..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 font-inter text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>
            </div>

            {/* Conversion Preview */}
            {formData.fiatAmount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="font-inter text-sm font-semibold text-blue-900">
                    Distribution Preview
                  </span>
                </div>
                <div className="space-y-2 font-inter text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Fiat Amount:</span>
                    <span className="text-blue-900 font-medium">
                      {formatCurrency(formData.fiatAmount)} {formData.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">USDC Equivalent:</span>
                    <span className="text-blue-900 font-medium">
                      {formatCurrency(formData.fiatAmount)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Per Token:</span>
                    <span className="text-blue-900 font-medium">
                      ${(formData.fiatAmount / (selectedAsset.totalTokens || 1)).toFixed(4)} USDC
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={confirmSettlement}
                disabled={processing || formData.fiatAmount <= 0}
                className="flex-1 font-inter font-medium rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                  boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                }}
              >
                {processing ? 'Recording Settlement...' : 'Confirm & Distribute'}
              </Button>
              <Button
                onClick={() => {
                  setShowSettlementModal(false);
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
  );
};

export default SettlementViewPage;
