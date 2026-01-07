/**
 * Protocol Card Component
 * Individual protocol card with borrow button
 */

import { formatPercentage, formatCompactNumber } from '../../../utils/solvency/format-credit.util';
import type { Protocol } from '../../../types/solvency.types';

interface ProtocolCardProps {
  protocol: Protocol;
  onBorrow: (protocol: Protocol) => void;
  disabled?: boolean;
}

export const ProtocolCard = ({ protocol, onBorrow, disabled = false }: ProtocolCardProps) => {
  return (
    <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow">
      {/* Protocol Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          {protocol.logo ? (
            <img src={protocol.logo} alt={protocol.name} className="w-8 h-8 rounded-lg" />
          ) : (
            <span className="text-white font-bold text-lg">{protocol.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[#111111] truncate">{protocol.name}</h3>
          <p className="text-xs text-[#6B7280]">{protocol.category}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-[#6B7280] mb-4 line-clamp-2 min-h-[40px]">
        {protocol.description}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
        <div>
          <div className="text-xs text-[#6B7280] mb-1">Expected APY</div>
          <div className="text-xl font-bold text-green-600">
            {formatPercentage(protocol.apy)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#6B7280] mb-1">TVL</div>
          <div className="text-xl font-semibold text-[#111111]">
            ${formatCompactNumber(protocol.tvl)}
          </div>
        </div>
      </div>

      {/* Borrow Rate */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[#6B7280]">Borrow Rate</span>
        <span className="text-sm font-semibold text-[#111111]">
          {formatPercentage(protocol.borrowRate)} APR
        </span>
      </div>

      {/* Borrow Button */}
      <button
        onClick={() => onBorrow(protocol)}
        disabled={disabled || !protocol.isActive}
        className={`w-full py-3 rounded-lg font-medium transition-colors ${
          disabled || !protocol.isActive
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-[#111111] text-white hover:bg-[#1a1a1a]'
        }`}
      >
        {protocol.isActive ? 'Borrow & Invest' : 'Coming Soon'}
      </button>
    </div>
  );
};
