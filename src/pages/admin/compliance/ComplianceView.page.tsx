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
import { PageLoader } from '../../../components/ui/page-loader';

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
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium font-geist ${badge.className}`}>
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
        <PageLoader text="Loading Compliance Assets..."/>
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
            className="px-6 py-2 bg-black text-white rounded-lg font-gellix text-sm font-medium hover:bg-black/90 transition-colors shadow-sm"
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
          <div className="bg-transparent rounded-2xl border border-gray-100 p-6 hover:bg-gray-50 hover:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 rounded-xl">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="font-gellix text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Review</p>
                <p className="font-gellix text-2xl font-bold text-foreground mt-1">{assetsForCompliance.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-trasnparent rounded-2xl border border-gray-100 p-6 hover:bg-gray-50 hover:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-gellix text-xs font-medium text-gray-500 uppercase tracking-wide">Low Risk Assets</p>
                <p className="font-gellix text-2xl font-bold text-foreground mt-1">
                  {assetsForCompliance.filter((a) => a.metadata?.riskTier?.toLowerCase() === 'a' || a.metadata?.riskTier?.toLowerCase() === 'low').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-transarent rounded-2xl border border-gray-100 p-6 hover:bg-gray-50 hover:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-gellix text-xs font-medium text-gray-500 uppercase tracking-wide">High Risk Assets</p>
                <p className="font-gellix text-2xl font-bold text-foreground mt-1">
                  {assetsForCompliance.filter((a) => a.metadata?.riskTier?.toLowerCase() === 'c' || a.metadata?.riskTier?.toLowerCase() === 'high').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Assets Table - Matching Portfolio Table Style */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
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
                {assetsForCompliance.map((asset) => {
                  const uploadDate = new Date(asset.createdAt);

                  return (
                    <tr
                      key={asset.assetId}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-gellix text-sm font-semibold text-foreground">
                          Invoice #{asset.metadata.invoiceNumber}
                        </div>
                        <div className="font-gellix text-xs text-gray-500 mt-0.5">
                          {asset.metadata.industry}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-gellix text-sm font-medium text-foreground">
                          {asset.metadata.buyerName}
                        </div>
                        <div className="font-mono text-xs text-gray-400 mt-0.5">
                          {asset.originator.slice(0, 6)}...{asset.originator.slice(-4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-gellix text-sm font-semibold text-foreground">
                          {asset.metadata.currency} {parseFloat(asset.metadata.faceValue).toLocaleString()}
                        </div>
                        <div className="font-gellix text-xs text-gray-500 mt-0.5">
                          {(parseFloat(asset.tokenParams.totalSupply) / 1e18).toLocaleString()} tokens
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getRiskBadge(asset.metadata.riskTier as RiskLevel)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-gellix text-sm text-gray-500">
                          {uploadDate.toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(asset)}
                            className="px-4 py-2 text-xs font-medium font-gellix text-white bg-black hover:bg-black/90 rounded-lg transition-colors shadow-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(asset)}
                            className="px-4 py-2 text-xs font-medium font-gellix text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
              <div className="px-6 py-16 text-center bg-white">
                <div className="w-16 h-16 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-gellix text-lg font-semibold text-foreground mb-2">
                  All Clear!
                </h3>
                <p className="font-gellix text-sm text-gray-500">
                  No assets pending compliance review
                </p>
              </div>
            )}
          </div>
        </div>

        {/* KYC Modal */}
        {showKycModal && selectedAsset && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
              <h3 className="font-gellix text-2xl font-semibold text-foreground mb-4">
                Trigger KYC Verification
              </h3>
              <p className="font-gellix text-sm text-gray-500 mb-6">
                This will send the asset data to the compliance engine for KYC verification.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="space-y-3 font-gellix text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Asset:</span>
                    <span className="text-foreground font-medium">Invoice #{selectedAsset.metadata.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Buyer:</span>
                    <span className="text-foreground font-medium">{selectedAsset.metadata.buyerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">KYC Provider:</span>
                    <span className="text-foreground font-medium">Chainalysis</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={confirmTriggerKYC}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-black hover:bg-black/90 text-white shadow-sm"
                >
                  {processing ? 'Triggering...' : 'Confirm'}
                </Button>
                <Button
                  onClick={() => {
                    setShowKycModal(false);
                    setSelectedAsset(null);
                  }}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Approve Modal */}
        {showApproveModal && selectedAsset && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-gellix text-2xl font-semibold text-foreground">
                  Approve Asset
                </h3>
              </div>

              <p className="font-gellix text-sm text-gray-500 mb-6">
                This asset will be marked as compliance-approved and ready for on-chain registration.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="space-y-3 font-gellix text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Asset:</span>
                    <span className="text-foreground font-medium">Invoice #{selectedAsset.metadata.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Value:</span>
                    <span className="text-foreground font-medium">{selectedAsset.metadata.currency} {parseFloat(selectedAsset.metadata.faceValue).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Risk Tier:</span>
                    <span className={`font-medium capitalize ${selectedAsset.metadata.riskTier.toLowerCase() === 'low' ? 'text-green-600' :
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
                  className="flex-1 font-gellix font-medium rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm"
                >
                  {processing ? 'Approving...' : 'Approve Asset'}
                </Button>
                <Button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedAsset(null);
                  }}
                  disabled={processing}
                  className="flex-1 font-gellix font-medium rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedAsset && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-gellix text-2xl font-semibold text-foreground">
                  Reject Asset
                </h3>
              </div>

              <p className="font-gellix text-sm text-gray-500 mb-6">
                Please provide a reason for rejecting this asset. The originator will be notified.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="space-y-3 font-gellix text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Asset:</span>
                    <span className="text-foreground font-medium">Invoice #{selectedAsset.metadata.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Buyer:</span>
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 font-gellix text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={confirmReject}
                  disabled={processing || !rejectionReason.trim()}
                  className="flex-1 font-gellix font-medium rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm"
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
                  className="flex-1 font-gellix font-medium rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-foreground"
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
