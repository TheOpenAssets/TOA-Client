import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Shield,
  Package,
  CheckCircle,
  Clock,
  Tag,
  BarChart2,
} from 'lucide-react';
import HeroBackground from '../../landing/HeroBackground';

interface AssetDetailsPageProps {
  asset: any;
}

type TabType = 'overview' | 'invoice' | 'cryptography' | 'timeline';

const AssetDetailsPage = ({ asset }: AssetDetailsPageProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if ((asset?.status === 'LISTED') && asset?.listing?.scheduledEndTime) {
      const interval = setInterval(() => {
        const endTime = new Date(asset.listing.scheduledEndTime).getTime();
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
          setTimeLeft('Auction ended');
          clearInterval(interval);
          return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [asset?.status, asset?.listing?.scheduledEndTime]);

  const formatCurrency = (amount: string | number): string => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: asset?.metadata?.currency || 'USD',
      minimumFractionDigits: 0,
    }).format(numericAmount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const soldPercentage =
    ((asset?.listing?.sold || 0) / (asset?.tokenParams?.totalSupply || 1)) * 100;


  const getStatusComponent = () => {
    if (asset?.status === 'PAYOUT_COMPLETE') {
      return (
        <div className="bg-green-100 border border-green-200 text-green-800 rounded-xl p-6 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3" />
          <h3 className="font-geist text-xl font-semibold">Payout Complete</h3>
          <p className="font-inter text-sm mt-1">
            The funds for this asset have been successfully paid out.
          </p>
        </div>
      );
    }

    if ((asset?.status === 'LISTED') && timeLeft) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 text-blue-500" />
          <h3 className="font-geist text-xl font-semibold text-blue-800">Auction in Progress</h3>
          <p className="font-mono text-2xl text-blue-600 mt-2">{timeLeft}</p>
        </div>
      )
    }

    return (
      <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 text-center">
        <Tag className="w-12 h-12 mx-auto mb-3 text-gray-500" />
        <h3 className="font-geist text-xl font-semibold text-gray-800">Status: {asset?.status}</h3>
        <p className="font-inter text-sm mt-1">
          Current phase of the asset.
        </p>
      </div>
    )
  };


  return (
    <div className="min-h-screen bg-white/5 max-w-[85vw] mx-auto">
      {/* Header */}
      <header className="w-full flex flex-row z-40 mt-5 mb-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/issuer/dashboard')}
            className="p-2 hover:bg-white rounded-xl transition-all duration-200 border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>
      </header>

      <main className="w-full mx-auto z-40 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left: Asset Details (2/3 width) */}
          <div className="lg:col-span-2 space-y-8 bg-transparent rounded-3xl p-6 shadow-md border border-gray-100">
            {/* Asset Header */}
            <div className="bg-white rounded-3xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="font-geist text-3xl font-medium text-[#111111] mb-2">
                    Invoice {asset?.metadata?.invoiceNumber || asset?.assetId}
                  </h1>
                  <p className="font-geist text-sm text-[#6B7280]">
                    {asset?.metadata?.industry} · {asset?.metadata?.buyerName}
                  </p>
                </div>
              </div>

              {/* Overview Metrics */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                <div>
                  <p className="font-geist text-xs text-[#6B7280] mb-1">Total Supply</p>
                  <p className="font-geist text-lg font-medium text-[#111111]">
                    {(parseInt(asset.tokenParams?.totalSupply || '0') / 1e18).toLocaleString()} tokens
                  </p>
                </div>
                <div>
                  <p className="font-geist text-xs text-[#6B7280] mb-1">Face Value</p>
                  <p className="font-geist text-lg font-medium text-[#111111]">
                    {formatCurrency(asset.metadata?.faceValue)}
                  </p>
                </div>
                <div>
                  <p className="font-geist text-xs text-[#6B7280] mb-1">Status</p>
                  <p className="font-geist text-lg font-medium text-[#111111]">
                    {asset?.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-white rounded-3xl p-6">
              <h2 className="font-geist text-2xl font-medium text-[#111111] mb-6">Invoice Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="font-geist text-xs text-[#6B7280]">Invoice Number</p>
                  <p className="font-geist text-sm font-medium text-[#111111]">
                    {asset.metadata?.invoiceNumber || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-geist text-xs text-[#6B7280]">Face Value</p>
                  <p className="font-geist text-sm font-medium text-[#111111]">
                    {formatCurrency(asset.metadata?.faceValue)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-geist text-xs text-[#6B7280]">Issue Date</p>
                  <p className="font-geist text-sm font-medium text-[#111111]">
                    {formatDate(asset.metadata?.issueDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-geist text-xs text-[#6B7280]">Due Date</p>
                  <p className="font-geist text-sm font-medium text-[#111111]">
                    {formatDate(asset.metadata?.dueDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-geist text-xs text-[#6B7280]">Industry</p>
                  <p className="font-geist text-sm font-medium text-[#111111]">
                    {asset.metadata?.industry || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-geist text-xs text-[#6B7280]">Buyer Name</p>
                  <p className="font-geist text-sm font-medium text-[#111111]">
                    {asset.metadata?.buyerName || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Cryptography Section */}
            <div className="bg-white rounded-3xl p-6">
              <h2 className="font-geist text-2xl font-medium text-[#111111] mb-6">Cryptography</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <p className="font-geist text-xs text-[#6B7280] mb-2">Document Hash</p>
                  <p className="font-mono text-xs break-all text-[#111111]">
                    {asset.cryptography?.documentHash || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <p className="font-geist text-xs text-[#6B7280] mb-2">Merkle Root</p>
                  <p className="font-mono text-xs break-all text-[#111111]">
                    {asset.cryptography?.merkleRoot || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6 ">
            {getStatusComponent()}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 z-20">
              <h3 className="font-geist font-semibold text-xl mb-6 text-[#111111]">
                Auction Progress
              </h3>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-geist text-sm text-[#6B7280] font-medium">
                      Sale Progress
                    </span>
                    <span className="font-geist font-semibold text-[#111111] text-base">
                      {soldPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-blue-400 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${soldPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-3 pt-3">
                  <div className="flex justify-between items-center bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <span className="font-geist text-sm text-[#6B7280] font-medium">
                      Sold Tokens
                    </span>
                    <span className="font-geist font-semibold text-[#111111] text-base">
                      {(parseInt(asset.listing?.sold || '0') / 1e18).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <span className="font-geist text-sm text-[#6B7280] font-medium">
                      Total Tokens
                    </span>
                    <span className="font-geist font-semibold text-[#111111] text-base">
                      {(parseInt(asset.tokenParams?.totalSupply || '0') / 1e18).toLocaleString()}
                    </span>
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
