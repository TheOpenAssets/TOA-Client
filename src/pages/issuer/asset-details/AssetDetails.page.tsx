import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Shield,
  Package,
  CheckCircle,
  Clock,
  Tag,
  BarChart2,
  List,
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
    if (asset?.listing?.phase === 'BIDDING' && asset?.listing?.listedAt && asset?.listing?.duration) {
      const interval = setInterval(() => {
        const endTime = new Date(asset.listing.listedAt).getTime() + (asset.listing.duration * 24 * 60 * 60 * 1000);
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
  }, [asset]);

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

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: BarChart2 },
    { id: 'invoice' as TabType, label: 'Invoice Details', icon: FileText },
    { id: 'cryptography' as TabType, label: 'Cryptography', icon: Shield },
    { id: 'timeline' as TabType, label: 'Timeline', icon: List },
  ];

  const getStatusComponent = () => {
    if (asset?.status === 'PAYOUT_COMPLETE') {
      return (
        <div className="bg-green-100 border border-green-200 text-green-800 rounded-xl p-6 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3" />
          <h3 className="font-antic text-xl font-semibold">Payout Complete</h3>
          <p className="font-inter text-sm mt-1">
            The funds for this asset have been successfully paid out.
          </p>
        </div>
      );
    }

    if (asset?.listing?.phase === 'BIDDING' && timeLeft) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                <h3 className="font-antic text-xl font-semibold text-blue-800">Auction in Progress</h3>
                <p className="font-mono text-2xl text-blue-600 mt-2">{timeLeft}</p>
            </div>
        )
    }

    return (
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 text-center">
            <Tag className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <h3 className="font-antic text-xl font-semibold text-gray-800">Status: {asset?.status}</h3>
            <p className="font-inter text-sm mt-1">
                Current phase of the asset.
            </p>
        </div>
    )
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
                {asset?.metadata?.invoiceNumber ? `Invoice #${asset.metadata.invoiceNumber}` : "Asset Details"}
              </h1>
              <p className="font-inter text-sm text-foreground/60 mt-1 flex items-center gap-2">
                <span>{asset?.assetType}</span>
                <span className="text-foreground/40">•</span>
                <span>{asset?.metadata?.industry}</span>
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
                          ? 'text-white bg-foreground/80'
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
                {activeTab === 'overview' && (
                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-5">
                            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                <Package className="w-5 h-5 text-foreground/60" />
                                <span className="font-inter text-sm text-foreground/70 font-medium">
                                    Total Supply
                                </span>
                                </div>
                                <p className="font-antic text-3xl font-normal text-foreground">
                                {parseInt(asset.tokenParams?.totalSupply || '0').toLocaleString()} Tokens
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                <DollarSign className="w-5 h-5 text-foreground/60" />
                                <span className="font-inter text-sm text-foreground/70 font-medium">
                                    Face Value
                                </span>
                                </div>
                                <p className="font-antic text-3xl font-normal text-foreground">
                                {formatCurrency(asset.metadata?.faceValue)}
                                </p>
                            </div>
                        </div>
                     </div>
                )}
                {activeTab === 'invoice' && (
                    <div className="space-y-4">
                         <div className="space-y-3">
                            <div className="flex items-start justify-between py-3 border-b border-gray-100">
                                <span className="font-inter text-sm text-gray-600">Invoice Number</span>
                                <span className="font-inter font-medium text-foreground">{asset.metadata?.invoiceNumber}</span>
                            </div>
                            <div className="flex items-start justify-between py-3 border-b border-gray-100">
                                <span className="font-inter text-sm text-gray-600">Face Value</span>
                                <span className="font-antic font-bold text-foreground text-lg">{formatCurrency(asset.metadata?.faceValue)}</span>
                            </div>
                            <div className="flex items-start justify-between py-3 border-b border-gray-100">
                                <span className="font-inter text-sm text-gray-600">Issue Date</span>
                                <span className="font-inter font-medium text-foreground">{formatDate(asset.metadata?.issueDate)}</span>
                            </div>
                            <div className="flex items-start justify-between py-3 border-b border-gray-100">
                                <span className="font-inter text-sm text-gray-600">Due Date</span>
                                <span className="font-inter font-medium text-foreground">{formatDate(asset.metadata?.dueDate)}</span>
                            </div>
                         </div>
                    </div>
                )}
                {activeTab === 'cryptography' && (
                     <div className="space-y-4">
                        <div className="font-mono text-xs break-all bg-gray-50 p-4 rounded-lg border">
                            <h4 className="font-sans font-semibold text-base mb-2">Document Hash</h4>
                            <p>{asset.cryptography?.documentHash}</p>
                        </div>
                        <div className="font-mono text-xs break-all bg-gray-50 p-4 rounded-lg border">
                            <h4 className="font-sans font-semibold text-base mb-2">Merkle Root</h4>
                            <p>{asset.cryptography?.merkleRoot}</p>
                        </div>
                     </div>
                )}
                {activeTab === 'timeline' && <div className="text-center py-8">Coming Soon</div>}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6 h-full">
            {getStatusComponent()}

            <div
              className="rounded-2xl shadow-lg p-6 h-full z-20"
              style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
            >
              <h3 className="font-antic font-normal text-xl mb-6 text-foreground">
                Auction Progress
              </h3>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-inter text-sm text-foreground/70 font-medium">
                      Sale Progress
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
                <div className="space-y-3 pt-3">
                  <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-200">
                    <span className="font-inter text-sm text-foreground/70 font-medium">
                      Sold Tokens
                    </span>
                    <span className="font-antic font-normal text-foreground text-base">
                      {parseInt(asset.listing?.sold || '0').toLocaleString()}
                    </span>
                  </div>
                   <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-200">
                    <span className="font-inter text-sm text-foreground/70 font-medium">
                      Total Tokens
                    </span>
                    <span className="font-antic font-normal text-foreground text-base">
                      {parseInt(asset.tokenParams?.totalSupply || '0').toLocaleString()}
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
