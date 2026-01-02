// src/components/portfolio/MyAssetsTable.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AssetMetadata {
  assetName?: string;
  industry?: string;
  riskTier?: string;
}

interface YieldInfo {
  settlementDistributed?: boolean;
  claimableYield?: string;
  claimableYieldFormatted?: string;
}

interface PortfolioAsset {
  assetId: string;
  totalAmount: string;
  totalInvested: string;
  tokenAddress?: string;
  metadata?: AssetMetadata;
  yieldInfo?: YieldInfo;
}

interface MyAssetsTableProps {
  assets: PortfolioAsset[];
  onClaimYield: (assetId: string) => void;
  claimingAssetId: string | null;
  claimStatus: string;
}

export const MyAssetsTable = ({
  assets,
  onClaimYield,
  claimingAssetId,
  claimStatus,
}: MyAssetsTableProps) => {
  const navigate = useNavigate();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const formatTokenAmount = (weiAmount: string): string => {
    const tokens = parseFloat(weiAmount) / 1e18;
    return tokens.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const formatUSDCAmount = (amount: string): number => {
    return parseFloat(amount) / 1e6;
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };



  if (!assets || assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-8">
          <p className="font-gellix text-sm text-gray-500 mb-4">No assets in your portfolio yet</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-normal hover:bg-blue-700 transition-colors"
          >
            Explore Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-gray-200 text-black">
            <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Asset ID
            </th>
            <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Tokens Owned
            </th>
            <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Amount Invested
            </th>
            <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Yield Earned
            </th>
            <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Risk Tier
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset, index) => (
            <>
              <tr
                key={asset.assetId}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  index % 2 === 0 ? 'bg-gray-10' : 'bg-gray-50/50'
                }`}
                onMouseEnter={() => setHoveredRow(asset.assetId)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => navigate(`/marketplace/asset/${asset.assetId}`)}
              >
                {/* Asset ID */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                   
                    <div>
                      <div className="font-gellix text-sm font-normal text-foreground">
                        {asset.metadata?.assetName || asset.assetId.slice(0, 8)}
                      </div>
                      <div className="font-gellix text-xs text-gray-400">
                        {asset.metadata?.industry || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Tokens Owned */}
                <td className="px-6 py-4 text-right">
                  <div className="font-gellix text-sm font-normal text-foreground">
                    {formatTokenAmount(asset.totalAmount)}
                  </div>
                </td>

                {/* Amount Invested */}
                <td className="px-6 py-4 text-right">
                  <div className="font-gellix text-sm font-normal text-foreground">
                    ${formatCurrency(formatUSDCAmount(asset.totalInvested))}
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-normal">
                    Active
                  </span>
                </td>

                {/* Yield Earned */}
                <td className="px-6 py-4 text-right">
                  <div
                    className={`font-gellix text-sm font-normal ${
                      asset.yieldInfo?.settlementDistributed &&
                      parseFloat(asset.yieldInfo?.claimableYield || '0') > 0
                        ? 'text-black-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {asset.yieldInfo?.claimableYieldFormatted || '$0.00'}
                  </div>
                </td>

                {/* Risk Tier */}
                <td className="px-6 py-4 text-center">
                  <span className="font-gellix text-sm text-foreground">
                    {asset.metadata?.riskTier || 'N/A'}
                  </span>
                </td>
              </tr>
              {hoveredRow === asset.assetId &&
                asset.yieldInfo?.settlementDistributed === true &&
                parseFloat(asset.yieldInfo?.claimableYield || '0') > 0 && (
                  <tr
                    className={`bg-black-50 transition-all ${
                      index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-50/50'
                    }`}
                  >
                    <td
                      colSpan={7}
                      className="px-6 py-2 text-center"
                      onMouseEnter={() => setHoveredRow(asset.assetId)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClaimYield(asset.assetId);
                        }}
                        disabled={claimingAssetId === asset.assetId}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-gellix text-sm font-normal hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {claimingAssetId === asset.assetId
                          ? claimStatus
                          : `Claim Yield (${asset.yieldInfo?.claimableYieldFormatted || '$0.00'})`}
                      </button>
                    </td>
                  </tr>
                )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
};
