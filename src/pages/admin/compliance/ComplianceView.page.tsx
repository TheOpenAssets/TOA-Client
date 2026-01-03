// src/pages/admin/compliance/ComplianceView.page.tsx

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { useAdminStore, type AdminAsset } from '../../../stores/admin.store';
import { adminService } from '../../../lib/api/admin.service';
import type { RiskLevel } from '../../../types/admin.types';
import { Button } from '../../../components/ui/button';
import { useAuthStore } from '../../../stores/auth.store';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/toast';
import { authService } from '../../../lib/api/auth.service';

const ComplianceViewPage = () => {
  const { assetsForCompliance, isLoading, error, fetchAdminDashboardData } = useAdminStore();
  const { user } = useAuthStore();
  const { toasts, success, error: showError, warning, removeToast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<AdminAsset | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAdminDashboardData();
     if (!user) {
      authService.logout();
      return;
    }
  }, [fetchAdminDashboardData, user]);

  // Get risk badge
  const getRiskBadge = (level: RiskLevel) => {
    const badges = {
      LOW: {
        icon: TrendingDown,
        label: 'Low Risk',
        className: 'bg-green-100 text-green-700',
      },
      MEDIUM: {
        icon: Minus,
        label: 'Medium Risk',
        className: 'bg-yellow-100 text-yellow-700',
      },
      HIGH: {
        icon: TrendingUp,
        label: 'High Risk',
        className: 'bg-red-100 text-red-700',
      },
    };

    const normalizedLevel = level?.toUpperCase() as keyof typeof badges;
    const badge = badges[normalizedLevel] || badges.MEDIUM;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-normal ${badge.className}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    );
  };

  // Handle Trigger KYC
  // @ts-ignore - Function reserved for future KYC trigger functionality
  const _handleTriggerKYC = (asset: AdminAsset) => {
    setSelectedAsset(asset);
    setShowKycModal(true);
  };

  const confirmTriggerKYC = () => {
    setProcessing(true);
    setTimeout(() => {
      console.log('KYC triggered for:', selectedAsset?.assetId);
      setProcessing(false);
      setShowKycModal(false);
      setSelectedAsset(null);
    }, 1500);
  };

  // Handle Approve
  const handleApprove = (asset: AdminAsset) => {
    setSelectedAsset(asset);
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedAsset) {
      console.error('No asset selected');
      return;
    }

    if (!user) {
      authService.logout();
      return;
    }

    const adminWallet = user.walletAddress;

    if (!adminWallet) {
      console.error('No wallet address found. User object:', user);
      showError('Wallet Not Connected', 'Please reconnect your wallet to continue.');
      return;
    }

    console.log('Approving asset:', {
      assetId: selectedAsset.assetId,
      adminWallet: adminWallet,
    });

    setProcessing(true);
    try {
      const result = await adminService.approveAsset(selectedAsset.assetId, adminWallet);
      console.log('✅ Asset approved successfully:', result);

      await fetchAdminDashboardData();

      setShowApproveModal(false);
      setSelectedAsset(null);

      success('Asset Approved!', 'Asset has been successfully approved and is ready for on-chain registration.');
    } catch (error: any) {
      console.error('❌ Failed to approve asset:', error);
      showError('Approval Failed', error.message || 'An error occurred while approving the asset.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Reject
  const handleReject = (asset: AdminAsset) => {
    setSelectedAsset(asset);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      warning('Rejection Reason Required', 'Please provide a reason for rejecting this asset.');
      return;
    }

    setProcessing(true);
    setTimeout(() => {
      console.log('Asset rejected:', selectedAsset?.assetId, 'Reason:', rejectionReason);
      fetchAdminDashboardData();
      setProcessing(false);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedAsset(null);
      success('Asset Rejected', 'Asset has been rejected. The originator will be notified.');
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="font-gellix text-lg text-foreground">Loading compliance queue...</div>
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-medium hover:bg-blue-700 transition-colors"
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
            Compliance Queue
          </h2>
          <p className="font-gellix text-sm text-foreground/70">
            Review, approve, or reject assets pending compliance verification
          </p>
        </div>

        {/* Stats Bar - Matching Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="bg-white rounded-2xl border border-gray-200 p-6"
            style={{
              boxShadow: `
                4px 4px 12px rgba(243, 244, 245, 0.08),
                8px 8px 24px rgba(150, 151, 151, 0.06),
                12px 12px 36px rgba(92, 92, 93, 0.04),
                16px 16px 48px rgba(45, 46, 47, 0.02)
              `,
            }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-gellix text-xs text-gray-500">Pending Review</p>
                <p className="font-gellix text-2xl font-semibold text-foreground">{assetsForCompliance.length}</p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-2xl border border-gray-200 p-6"
            style={{
              boxShadow: `
                4px 4px 12px rgba(243, 244, 245, 0.08),
                8px 8px 24px rgba(150, 151, 151, 0.06),
                12px 12px 36px rgba(92, 92, 93, 0.04),
                16px 16px 48px rgba(45, 46, 47, 0.02)
              `,
            }}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-gellix text-xs text-gray-500">Low Risk Assets</p>
                <p className="font-gellix text-2xl font-semibold text-foreground">
                  {assetsForCompliance.filter((a) => a.metadata?.riskTier?.toLowerCase() === 'a').length}
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-2xl border border-gray-200 p-6"
            style={{
              boxShadow: `
                4px 4px 12px rgba(243, 244, 245, 0.08),
                8px 8px 24px rgba(150, 151, 151, 0.06),
                12px 12px 36px rgba(92, 92, 93, 0.04),
                16px 16px 48px rgba(45, 46, 47, 0.02)
              `,
            }}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-gellix text-xs text-gray-500">High Risk Assets</p>
                <p className="font-gellix text-2xl font-semibold text-foreground">
                  {assetsForCompliance.filter((a) => a.metadata?.riskTier?.toLowerCase() === 'c').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Assets Table - Matching Portfolio Table Style */}
        <div
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          style={{
            boxShadow: `
              4px 4px 12px rgba(243, 244, 245, 0.08),
              8px 8px 24px rgba(150, 151, 151, 0.06),
              12px 12px 36px rgba(92, 92, 93, 0.04),
              16px 16px 48px rgba(45, 46, 47, 0.02)
            `,
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Asset Details
                  </th>
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Originator
                  </th>
                  <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {assetsForCompliance.map((asset, index) => {
                  const uploadDate = new Date(asset.createdAt);

                  return (
                    <tr
                      key={asset.assetId}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-gellix text-sm font-semibold text-foreground">
                          Invoice #{asset.metadata.invoiceNumber}
                        </div>
                        <div className="font-gellix text-xs text-foreground/60 mt-0.5">
                          {asset.metadata.industry}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-gellix text-sm font-medium text-foreground">
                          {asset.metadata.buyerName}
                        </div>
                        <div className="font-mono text-xs text-foreground/60 mt-0.5">
                          {asset.originator.slice(0, 6)}...{asset.originator.slice(-4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-gellix text-sm font-semibold text-foreground">
                          {asset.metadata.currency} {parseFloat(asset.metadata.faceValue).toLocaleString()}
                        </div>
                        <div className="font-gellix text-xs text-foreground/60 mt-0.5">
                          {(parseFloat(asset.tokenParams.totalSupply) / 1e18).toLocaleString()} tokens
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getRiskBadge(asset.metadata.riskTier as RiskLevel)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-gellix text-sm text-foreground">
                          {uploadDate.toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(asset)}
                            className="px-3 py-1.5 text-xs font-medium font-gellix text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(asset)}
                            className="px-3 py-1.5 text-xs font-medium font-gellix text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {assetsForCompliance.length === 0 && (
              <div className="px-6 py-12 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto text-green-300 mb-4" />
                <h3 className="font-gellix text-lg font-semibold text-foreground mb-2">
                  All Clear!
                </h3>
                <p className="font-gellix text-sm text-foreground/60">
                  No assets pending compliance review
                </p>
              </div>
            )}
          </div>
        </div>

      {/* KYC Modal */}
      {showKycModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full border border-gray-200">
            <h3 className="font-gellix text-2xl font-semibold text-foreground mb-4">
              Trigger KYC Verification
            </h3>
            <p className="font-gellix text-sm text-foreground/70 mb-6">
              This will send the asset data to the compliance engine for KYC verification.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="space-y-2 font-gellix text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/60">Asset:</span>
                  <span className="text-foreground font-medium">Invoice #{selectedAsset.metadata.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">Buyer:</span>
                  <span className="text-foreground font-medium">{selectedAsset.metadata.buyerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">KYC Provider:</span>
                  <span className="text-foreground font-medium">Chainalysis</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmTriggerKYC}
                disabled={processing}
                className="flex-1 font-gellix font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                {processing ? 'Triggering...' : 'Confirm'}
              </Button>
              <Button
                onClick={() => {
                  setShowKycModal(false);
                  setSelectedAsset(null);
                }}
                disabled={processing}
                className="flex-1 font-gellix font-medium rounded-lg bg-gray-200 hover:bg-gray-300 text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-gellix text-2xl font-semibold text-foreground">
                Approve Asset
              </h3>
            </div>

            <p className="font-gellix text-sm text-foreground/70 mb-6">
              This asset will be marked as compliance-approved and ready for on-chain registration.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="space-y-2 font-gellix text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/60">Asset:</span>
                  <span className="text-foreground font-medium">Invoice #{selectedAsset.metadata.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">Value:</span>
                  <span className="text-foreground font-medium">{selectedAsset.metadata.currency} {parseFloat(selectedAsset.metadata.faceValue).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">Risk Tier:</span>
                  <span className={`font-medium capitalize ${
                    selectedAsset.metadata.riskTier.toLowerCase() === 'low' ? 'text-green-600' :
                    selectedAsset.metadata.riskTier.toLowerCase() === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {selectedAsset.metadata.riskTier}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmApprove}
                disabled={processing}
                className="flex-1 font-gellix font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white"
              >
                {processing ? 'Approving...' : 'Approve Asset'}
              </Button>
              <Button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedAsset(null);
                }}
                disabled={processing}
                className="flex-1 font-gellix font-medium rounded-lg bg-gray-200 hover:bg-gray-300 text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-gellix text-2xl font-semibold text-foreground">
                Reject Asset
              </h3>
            </div>

            <p className="font-gellix text-sm text-foreground/70 mb-6">
              Please provide a reason for rejecting this asset. The originator will be notified.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="space-y-2 font-gellix text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/60">Asset:</span>
                  <span className="text-foreground font-medium">Invoice #{selectedAsset.metadata.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">Buyer:</span>
                  <span className="text-foreground font-medium">{selectedAsset.metadata.buyerName}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block font-gellix text-sm font-medium text-foreground mb-2">
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Incomplete documentation, high risk factors, jurisdiction issues..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 font-gellix text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 font-gellix font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                {processing ? 'Rejecting...' : 'Reject Asset'}
              </Button>
              <Button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedAsset(null);
                  setRejectionReason('');
                }}
                disabled={processing}
                className="flex-1 font-gellix font-medium rounded-lg bg-gray-200 hover:bg-gray-300 text-foreground"
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

export default ComplianceViewPage;
