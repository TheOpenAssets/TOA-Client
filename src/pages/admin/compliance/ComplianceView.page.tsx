// src/pages/admin/compliance/ComplianceView.page.tsx

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { useAdminStore, type AdminAsset } from '../../../stores/admin.store';
import { adminService } from '../../../lib/api/admin.service';
import type { RiskLevel } from '../../../types/admin.types';
import { Button } from '../../../components/ui/button';
import { useAuthStore } from '../../../stores/auth.store';

const ComplianceViewPage = () => {
  const { assetsForCompliance, isLoading, error, fetchAdminDashboardData } = useAdminStore();
  const { user } = useAuthStore();
  const [selectedAsset, setSelectedAsset] = useState<AdminAsset | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

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

  // Get risk badge
  const getRiskBadge = (level: RiskLevel) => {
    const badges = {
      LOW: {
        icon: TrendingDown,
        label: 'Low Risk',
        className: 'bg-green-100 text-green-700 border-green-200',
      },
      MEDIUM: {
        icon: Minus,
        label: 'Medium Risk',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      },
      HIGH: {
        icon: TrendingUp,
        label: 'High Risk',
        className: 'bg-red-100 text-red-700 border-red-200',
      },
    };

    // Normalize the level to uppercase and handle invalid values
    const normalizedLevel = level?.toUpperCase() as keyof typeof badges;
    const badge = badges[normalizedLevel] || badges.MEDIUM; // Default to MEDIUM if invalid
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${badge.className}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    );
  };

  // Handle Trigger KYC
  const handleTriggerKYC = (asset: AdminAsset) => {
    setSelectedAsset(asset);
    setShowKycModal(true);
  };

  const confirmTriggerKYC = () => {
    setProcessing(true);
    // Simulate API call
    setTimeout(() => {
      console.log('KYC triggered for:', selectedAsset?.name);
      setProcessing(false);
      setShowKycModal(false);
      setSelectedAsset(null);
      // In real app: Update asset status to KYC_IN_PROGRESS
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
      console.error('No user found in auth store');
      alert('User not authenticated. Please login again.');
      return;
    }

    // Get wallet address - check both possible property names
    const adminWallet = user.walletAddress || user.wallet || address;
    
    if (!adminWallet) {
      console.error('No wallet address found. User object:', user);
      alert('Wallet address not found. Please reconnect your wallet.');
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
      
      // Refresh the dashboard data
      await fetchAdminDashboardData();
      
      // Close modal and reset
      setShowApproveModal(false);
      setSelectedAsset(null);
      
      // Show success message
      alert('Asset approved successfully!');
    } catch (error: any) {
      console.error('❌ Failed to approve asset:', error);
      alert(`Failed to approve asset: ${error.message}`);
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
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    // Simulate API call
    setTimeout(() => {
      console.log('Asset rejected:', selectedAsset?.assetId, 'Reason:', rejectionReason);
      fetchAdminDashboardData();
      setProcessing(false);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedAsset(null);
      // In real app: Update backend status to COMPLIANCE_REJECTED
    }, 1500);
  };

  if (isLoading) {
    return <div>Loading compliance queue...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-antic text-3xl font-normal text-foreground mb-2">
          Compliance Queue
        </h2>
        <p className="font-inter text-sm text-foreground/70">
          Review, approve, or reject assets pending compliance verification
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
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Pending Review</p>
              <p className="font-antic text-2xl font-normal text-foreground">{assetsForCompliance.length}</p>
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
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Low Risk Assets</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {assetsForCompliance.filter((a) => a.metadata?.riskTier?.toLowerCase() === 'a').length}
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
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">High Risk Assets</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {assetsForCompliance.filter((a) => a.metadata?.riskTier?.toLowerCase() === 'c').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div
        className="rounded-2xl p-8 shadow-lg"
        style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
      >
        <div className="overflow-x-auto bg-white rounded-xl">
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
                  Asset Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
                  Originator
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
                  Value
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
                  Risk Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
                  Uploaded
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {assetsForCompliance.map((asset) => {
                const uploadDate = new Date(asset.createdAt);
                const daysAgo = Math.floor(
                  (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <tr
                    key={asset.assetId}
                    className="hover:bg-gray-50/50 transition-all duration-200"
                  >
                    <td className="px-6 py-5">
                      <div>
                        <div className="font-antic font-normal text-foreground text-base">
                          Invoice #{asset.metadata.invoiceNumber}
                        </div>
                        <div className="font-inter text-xs text-foreground/60 mt-0.5">
                          {asset.metadata.industry}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <FileText className="w-3 h-3 text-foreground/50" />
                          <span className="font-inter text-xs text-foreground/50">
                            {asset.files?.length ?? 0} documents
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <div className="font-inter font-medium text-foreground text-sm">
                          {asset.metadata.buyerName}
                        </div>
                        <div className="font-inter text-xs text-foreground/60 mt-0.5 font-mono">
                          {asset.originator.slice(0, 6)}...{asset.originator.slice(-4)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-antic font-normal text-foreground text-base">
                        {asset.metadata.currency} {parseFloat(asset.metadata.faceValue).toLocaleString()}
                      </div>
                      <div className="font-inter text-xs text-foreground/60 mt-0.5">
                        {(parseFloat(asset.tokenParams.totalSupply) / 1e18).toLocaleString()} tokens
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        {getRiskBadge(asset.metadata.riskTier as RiskLevel)}
                        <div className="font-inter text-xs text-foreground/60">
                          Risk: {asset.metadata.riskTier}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-inter text-sm text-foreground">
                        {uploadDate.toLocaleDateString()}
                      </div>
                      <div className="font-inter text-xs text-foreground/60 mt-0.5">
                        {daysAgo} days ago
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTriggerKYC(asset)}
                          className="px-3 py-1.5 text-xs font-medium font-inter text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Trigger KYC
                        </button>
                        <button
                          onClick={() => handleApprove(asset)}
                          className="px-3 py-1.5 text-xs font-medium font-inter text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(asset)}
                          className="px-3 py-1.5 text-xs font-medium font-inter text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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
              <h3 className="font-antic text-lg font-semibold text-foreground mb-2">
                All Clear!
              </h3>
              <p className="font-inter text-sm text-foreground/60">
                No assets pending compliance review
              </p>
            </div>
          )}
        </div>
      </div>

      {/* KYC Modal */}
      {showKycModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-8 max-w-lg w-full"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <h3 className="font-antic text-2xl font-normal text-foreground mb-4">
              Trigger KYC Verification
            </h3>
            <p className="font-inter text-sm text-foreground/70 mb-6">
              This will send the asset data to the compliance engine for KYC verification.
            </p>

            <div className="bg-white rounded-xl p-4 mb-6">
              <div className="space-y-2 font-inter text-sm">
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
                className="flex-1 font-inter font-medium rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                  boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                }}
              >
                {processing ? 'Triggering...' : 'Confirm'}
              </Button>
              <Button
                onClick={() => {
                  setShowKycModal(false);
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

      {/* Approve Modal */}
      {showApproveModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-8 max-w-lg w-full"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Approve Asset
              </h3>
            </div>

            <p className="font-inter text-sm text-foreground/70 mb-6">
              This asset will be marked as compliance-approved and ready for on-chain registration.
            </p>

            <div className="bg-white rounded-xl p-4 mb-6">
              <div className="space-y-2 font-inter text-sm">
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
                className="flex-1 font-inter font-medium rounded-xl bg-green-600 hover:bg-green-700 text-white"
              >
                {processing ? 'Approving...' : 'Approve Asset'}
              </Button>
              <Button
                onClick={() => {
                  setShowApproveModal(false);
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

      {/* Reject Modal */}
      {showRejectModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-8 max-w-lg w-full"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Reject Asset
              </h3>
            </div>

            <p className="font-inter text-sm text-foreground/70 mb-6">
              Please provide a reason for rejecting this asset. The originator will be notified.
            </p>

            <div className="bg-white rounded-xl p-4 mb-4">
              <div className="space-y-2 font-inter text-sm">
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
              <label className="block font-inter text-sm font-medium text-foreground mb-2">
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Incomplete documentation, high risk factors, jurisdiction issues..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 font-inter text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 font-inter font-medium rounded-xl bg-red-600 hover:bg-red-700 text-white"
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

export default ComplianceViewPage;
