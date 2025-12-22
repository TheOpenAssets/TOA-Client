// src/pages/issuer/asset-details/AssetDetails.page.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type IssuerAsset } from '../../../types/issuer.types';
import { mockClaimTokens } from '../../../lib/contracts/token-claim.service';
import { Button } from '../../../components/ui/button';
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Shield,
  Package,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import HeroBackground from '../../landing/HeroBackground';

interface AssetDetailsPageProps {
  asset: IssuerAsset;
}

type TabType = 'overview' | 'invoice' | 'risk' | 'audit';

const AssetDetailsPage = ({ asset }: AssetDetailsPageProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleClaimTokens = async () => {
    setIsClaiming(true);
    setClaimError(null);

    try {
      // Mock wallet address - in real implementation, get from wallet connection
      const mockWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      const result = await mockClaimTokens({
        assetId: asset.id,
        amount: asset.tokenDistribution.unsoldTokens,
        walletAddress: mockWalletAddress,
      });

      if (result.success) {
        setClaimSuccess(true);
        // Reset success message after 5 seconds
        setTimeout(() => setClaimSuccess(false), 5000);
      } else {
        setClaimError(result.error || 'Failed to claim tokens');
      }
    } catch (error) {
      setClaimError('An unexpected error occurred');
    } finally {
      setIsClaiming(false);
    }
  };

  const soldPercentage =
    (asset.tokenDistribution.soldTokens / asset.tokenDistribution.totalTokens) * 100;

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: FileText },
    { id: 'invoice' as TabType, label: 'Invoice Details', icon: DollarSign },
    { id: 'risk' as TabType, label: 'Risk Factors', icon: AlertTriangle },
    { id: 'audit' as TabType, label: 'Audit', icon: Shield },
  ];

  const getRiskLevelColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <HeroBackground />
      {/* Header */}
      <header className="bg-transparent border-b border-gray-200 relative top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/issuer/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-foreground/60" />
            </button>
            <div className="flex-1">
              <h1 className="font-antic text-2xl font-normal text-foreground">
                {asset.name}
              </h1>
              <p className="font-inter text-sm text-foreground/60 mt-1 flex items-center gap-2">
                <span>{asset.assetType}</span>
                <span className="text-foreground/40">•</span>
                <span>{asset.location}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-start">
          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col space-y-6 h-full z-20">
            {/* Tabs */}
            <div
              className="rounded-2xl shadow-lg overflow-hidden flex flex-col flex-1"
              style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
            >
              <div className="border-b border-gray-200">
                <nav className="flex p-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 px-4 py-3 font-inter font-medium text-sm transition-all duration-200 rounded-lg ${
                        activeTab === tab.id
                          ? 'text-black/30 bg-foreground'
                          : 'text-foreground/70 hover:text-foreground hover:bg-white/50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <tab.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-8 overflow-y-auto  flex-1">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-antic font-normal text-xl mb-3 text-foreground">
                        Asset Overview
                      </h3>
                      <p className="font-inter text-foreground/70 leading-relaxed text-base">
                        {asset.overview ||
                          'This asset represents a tokenized real-world asset with fractional ownership enabled through blockchain technology.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center gap-3 mb-3">
                          <Package className="w-5 h-5 text-foreground/60" />
                          <span className="font-inter text-sm text-foreground/70 font-medium">
                            Total Tokens
                          </span>
                        </div>
                        <p className="font-antic text-3xl font-normal text-foreground">
                          {asset.tokenDistribution.totalTokens.toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center gap-3 mb-3">
                          <TrendingUp className="w-5 h-5 text-foreground/60" />
                          <span className="font-inter text-sm text-foreground/70 font-medium">
                            Token Price
                          </span>
                        </div>
                        <p className="font-antic text-3xl font-normal text-foreground">
                          {formatCurrency(asset.tokenDistribution.tokenPrice)}
                        </p>
                      </div>
                    </div>

                    {/* Invoice Summary */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                      <h4 className="font-antic font-normal text-lg mb-4 flex items-center gap-2 text-foreground">
                        <DollarSign className="w-5 h-5 text-foreground/60" />
                        Invoice Summary
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="font-inter text-sm text-foreground/70">
                            Invoice Number
                          </span>
                          <span className="font-inter font-medium text-foreground">
                            {asset.invoice.invoiceNumber}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="font-inter text-sm text-foreground/70">Amount</span>
                          <span className="font-antic font-normal text-lg text-foreground">
                            {formatCurrency(asset.invoice.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="font-inter text-sm text-foreground/70">Due Date</span>
                          <span className="font-inter font-medium text-foreground">
                            {formatDate(asset.invoice.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Details Tab */}
                {activeTab === 'invoice' && (
                  <div className="space-y-4">
                    <h3 className="font-antic font-semibold text-lg mb-4 text-foreground">
                      Complete Invoice Information
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-start justify-between py-3 border-b border-gray-100">
                        <span className="font-inter text-sm text-gray-600">
                          Invoice Number
                        </span>
                        <span className="font-inter font-medium text-foreground">
                          {asset.invoice.invoiceNumber}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-3 border-b border-gray-100">
                        <span className="font-inter text-sm text-gray-600">
                          Invoice Amount
                        </span>
                        <span className="font-antic font-bold text-foreground text-lg">
                          {formatCurrency(asset.invoice.amount)}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-3 border-b border-gray-100">
                        <span className="font-inter text-sm text-gray-600">Issue Date</span>
                        <span className="font-inter font-medium text-foreground">
                          {formatDate(asset.invoice.issueDate)}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-3 border-b border-gray-100">
                        <span className="font-inter text-sm text-gray-600">Due Date</span>
                        <span className="font-inter font-medium text-foreground">
                          {formatDate(asset.invoice.dueDate)}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-3 border-b border-gray-100">
                        <span className="font-inter text-sm text-gray-600">
                          Payment Terms
                        </span>
                        <span className="font-inter font-medium text-foreground">
                          {asset.invoice.paymentTerms}
                        </span>
                      </div>

                      <div className="pt-3">
                        <span className="font-inter text-sm text-gray-600 block mb-2">
                          Description
                        </span>
                        <p className="font-inter text-foreground leading-relaxed">
                          {asset.invoice.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Risk Factors Tab */}
                {activeTab === 'risk' && (
                  <div className="space-y-4">
                    <h3 className="font-antic font-semibold text-lg mb-4 text-foreground">
                      Risk Assessment
                    </h3>

                    {asset.riskFactors.length > 0 ? (
                      <div className="space-y-3">
                        {asset.riskFactors.map((risk, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-gray-600" />
                                <h4 className="font-inter font-semibold text-foreground">
                                  {risk.category}
                                </h4>
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRiskLevelColor(
                                  risk.level
                                )}`}
                              >
                                {risk.level.toUpperCase()}
                              </span>
                            </div>
                            <p className="font-inter text-sm text-gray-700 leading-relaxed">
                              {risk.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-inter text-gray-500">
                          No risk factors documented
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Audit Tab */}
                {activeTab === 'audit' && (
                  <div className="space-y-4">
                    <h3 className="font-antic font-semibold text-lg mb-4 text-foreground">
                      Audit Information
                    </h3>

                    {asset.audit ? (
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="font-inter text-sm text-gray-600 block mb-1">
                                Auditor
                              </span>
                              <span className="font-inter font-medium text-foreground">
                                {asset.audit.auditor}
                              </span>
                            </div>
                            <div>
                              <span className="font-inter text-sm text-gray-600 block mb-1">
                                Audit Date
                              </span>
                              <span className="font-inter font-medium text-foreground">
                                {formatDate(asset.audit.auditDate)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <span className="font-inter text-sm text-gray-600 block mb-2">
                            Status
                          </span>
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                              asset.audit.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : asset.audit.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {asset.audit.status === 'completed' && (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            {asset.audit.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        {asset.audit.findings && (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <span className="font-inter text-sm text-gray-600 block mb-2">
                              Findings
                            </span>
                            <p className="font-inter text-foreground leading-relaxed">
                              {asset.audit.findings}
                            </p>
                          </div>
                        )}

                        {asset.audit.reportUrl && (
                          <Button
                            onClick={() => window.open(asset.audit?.reportUrl, '_blank')}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                          >
                            View Full Audit Report
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-inter text-gray-500">No audit information available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6 h-full">
            {/* Token Distribution Card */}
            <div
              className="rounded-2xl shadow-lg p-6 h-full z-20"
              style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
            >
              <h3 className="font-antic font-normal text-xl mb-6 text-foreground">
                Token Distribution
              </h3>

              <div className="space-y-5">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-inter text-sm text-foreground/70 font-medium">
                      Sales Progress
                    </span>
                    <span className="font-inter font-semibold text-foreground text-base">
                      {soldPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-foreground h-2 rounded-full transition-all duration-500"
                      style={{ width: `${soldPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 pt-3">
                  <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-200">
                    <span className="font-inter text-sm text-foreground/70 font-medium">
                      Sold Tokens
                    </span>
                    <span className="font-antic font-normal text-foreground text-base">
                      {asset.tokenDistribution.soldTokens.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-200">
                    <span className="font-inter text-sm text-foreground/70 font-medium">
                      Unsold Tokens
                    </span>
                    <span className="font-antic font-normal text-foreground text-base">
                      {asset.tokenDistribution.unsoldTokens.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-200">
                    <span className="font-inter text-sm text-foreground/70 font-medium">
                      Total Tokens
                    </span>
                    <span className="font-antic font-normal text-foreground text-base">
                      {asset.tokenDistribution.totalTokens.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Claim Unsold Tokens Card */}
            <div
              className="rounded-2xl shadow-lg p-6 h-full"
              style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
            >
              <h3 className="font-antic font-normal text-xl mb-4 text-foreground/70 ">
                Claim Unsold Tokens
              </h3>

              <p className="font-inter text-sm text-foreground/70 mb-5">
                You have {asset.tokenDistribution.unsoldTokens.toLocaleString()} unsold tokens
                available to claim.
              </p>

              <div className="bg-white rounded-xl p-5 mb-5 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-inter text-sm text-foreground/70 font-medium">
                    Claimable Amount
                  </span>
                  <span className="font-antic font-normal text-foreground text-xl">
                    {asset.tokenDistribution.unsoldTokens.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-px bg-gray-200 my-3"></div>
                <div className="flex justify-between items-center">
                  <span className="font-inter text-sm text-foreground/70 font-medium">
                    Estimated Value
                  </span>
                  <span className="font-antic font-normal text-foreground text-lg">
                    {formatCurrency(
                      asset.tokenDistribution.unsoldTokens *
                        asset.tokenDistribution.tokenPrice
                    )}
                  </span>
                </div>
              </div>

              {claimSuccess && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-foreground" />
                    <span className="font-inter text-sm text-foreground font-medium">
                      Tokens claimed successfully!
                    </span>
                  </div>
                </div>
              )}

              {claimError && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-foreground/60" />
                    <span className="font-inter text-sm text-foreground/70 font-medium">
                      {claimError}
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleClaimTokens}
                disabled={isClaiming || asset.tokenDistribution.unsoldTokens === 0}
                className="w-full bg-foreground hover:bg-foreground/90 text-black font-inter font-medium py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Claiming Tokens...
                  </>
                ) : (
                  'Claim Unsold Tokens'
                )}
              </Button>

              <p className="font-inter text-xs text-foreground/60 mt-3 text-center">
                Tokens will be transferred to your connected wallet
              </p>
            </div>

            {/* Quick Info */}
            <div
              className="rounded-2xl shadow-lg p-6 h-full"
              style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
            >
              <h3 className="font-antic font-normal text-xl mb-5 text-foreground">
                Quick Info
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                  <Calendar className="w-4 h-4 text-foreground/60" />
                  <div>
                    <div className="font-inter text-xs text-foreground/60 font-medium">Created</div>
                    <div className="font-inter text-sm text-foreground font-medium">
                      {formatDate(asset.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                  <FileText className="w-4 h-4 text-foreground/60" />
                  <div className="min-w-0 flex-1">
                    <div className="font-inter text-xs text-foreground/60 font-medium">Asset ID</div>
                    <div className="font-mono text-sm text-foreground font-medium truncate">
                      {asset.id}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssetDetailsPage;
