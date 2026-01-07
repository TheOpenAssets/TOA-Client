// src/components/portfolio/MyLoansTable.tsx

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Position } from '../../types/solvency.types';
import { format } from 'date-fns';
import { Wallet, ArrowUpDown } from 'lucide-react';

interface MyLoansTableProps {
  positions: Position[];
  isLoading: boolean;
}

// A simple formatter, assuming value is in WEI (6 decimals for USDC)
const formatUSD = (value: string) => {
  if (!value) return '$0.00';
  const num = parseFloat(value) / 1e6;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Format collateral amount (18 decimals)
const formatCollateralAmount = (value: string, decimals: number = 18) => {
  if (!value) return '0.00';
  const num = parseFloat(value) / Math.pow(10, decimals);
  return num.toFixed(2);
};

// A simple formatter, assuming value is like 15300 for 153.00%
const formatHealthFactor = (value: number) => {
  return `${(value / 100).toFixed(2)}%`;
};

const getHealthColor = (healthFactor: number) => {
  if (healthFactor >= 15000) return 'text-[#10B981]'; // Healthy (>= 150%)
  if (healthFactor >= 12000) return 'text-[#F59E0B]'; // Warning (120-150%)
  return 'text-[#EF4444]'; // Critical (< 120%)
};

const getHealthBadgeColor = (healthStatus: string) => {
  switch (healthStatus) {
    case 'HEALTHY':
      return 'bg-[#D1FAE5] text-[#065F46]';
    case 'WARNING':
      return 'bg-[#FEF3C7] text-[#92400E]';
    case 'CRITICAL':
      return 'bg-[#FEE2E2] text-[#991B1B]';
    default:
      return 'bg-[#F3F4F6] text-[#6B7280]';
  }
};

type FilterType = 'all' | 'healthy' | 'warning' | 'critical';
type SortType = 'date' | 'health' | 'debt';

export const MyLoansTable = ({ positions, isLoading }: MyLoansTableProps) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date');

  // Filter and sort positions
  const filteredAndSortedPositions = useMemo(() => {
    let filtered = [...positions];

    // Apply filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (activeFilter === 'healthy') return p.healthStatus === 'HEALTHY';
        if (activeFilter === 'warning') return p.healthStatus === 'WARNING';
        if (activeFilter === 'critical') return p.healthStatus === 'CRITICAL';
        return true;
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'health') {
        return a.healthFactor - b.healthFactor;
      }
      if (sortBy === 'debt') {
        return parseFloat(b.outstandingDebt) - parseFloat(a.outstandingDebt);
      }
      return 0;
    });

    return filtered;
  }, [positions, activeFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#111111]"></div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-[24px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F3F4F6] flex items-center justify-center">
          <Wallet className="w-8 h-8 text-[#6B7280]" />
        </div>
        <h3 className="text-xl font-semibold text-[#111111] mb-2">
          No Active Loans
        </h3>
        <p className="text-sm text-[#6B7280] mb-6 max-w-md mx-auto">
          You haven't borrowed against your assets yet. Start borrowing USDC using your RWA tokens as collateral.
        </p>
        <button
          onClick={() => navigate('/borrow')}
          className="px-6 py-3 bg-[#111111] hover:bg-[#1a1a1a] text-white rounded-[12px] font-medium transition-all"
        >
          Start Borrowing
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#F3F4F6] text-[#111111]'
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            All Loans
          </button>
          <button
            onClick={() => setActiveFilter('healthy')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === 'healthy'
                ? 'bg-[#F3F4F6] text-[#111111]'
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            Healthy
          </button>
          <button
            onClick={() => setActiveFilter('warning')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === 'warning'
                ? 'bg-[#F3F4F6] text-[#111111]'
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            At Risk
          </button>
          <button
            onClick={() => setActiveFilter('critical')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === 'critical'
                ? 'bg-[#F3F4F6] text-[#111111]'
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            Critical
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-[#6B7280]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#111111] font-medium outline-none focus:ring-2 focus:ring-[#111111]"
          >
            <option value="date">Newest First</option>
            <option value="health">Health Factor</option>
            <option value="debt">Debt Amount</option>
          </select>
        </div>
      </div>

      {/* Card Grid */}
      {filteredAndSortedPositions.length === 0 ? (
        <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
          <p className="text-sm text-[#6B7280]">No loans match the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPositions.map((position) => (
            <div
              key={position.positionId}
              className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow"
            >
              {/* Position Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B7280]">Position</span>
                  <span className="font-semibold text-[#111111]">#{position.positionId}</span>
                </div>
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-medium ${getHealthBadgeColor(
                    position.healthStatus
                  )}`}
                >
                  {position.healthStatus}
                </span>
              </div>

              {/* Collateral Info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {position.collateralToken.symbol.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#111111]">
                      {position.collateralToken.symbol}
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      {formatCollateralAmount(position.collateralAmount, 18)} tokens
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[#6B7280]">
                  Collateral Value:{' '}
                  <span className="text-[#111111] font-medium">{formatUSD(position.tokenValueUSD)}</span>
                </div>
              </div>

              {/* Debt Info */}
              <div className="bg-[#F9FAFB] rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-[#6B7280]">Outstanding Debt</span>
                  <span className="text-lg font-bold text-[#111111]">
                    {formatUSD(position.outstandingDebt)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#6B7280]">Health Factor</span>
                  <span className={`text-sm font-semibold ${getHealthColor(position.healthFactor)}`}>
                    {formatHealthFactor(position.healthFactor)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg text-sm font-medium text-[#111111] transition-colors">
                  Repay
                </button>
                <button className="flex-1 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg text-sm font-medium text-[#111111] transition-colors">
                  Add Collateral
                </button>
              </div>

              {/* Date */}
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-[#6B7280] text-center">
                Created {format(new Date(position.createdAt), 'MMM d, yyyy')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
