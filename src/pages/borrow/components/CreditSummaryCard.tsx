/**
 * Credit Summary Card Component
 * Displays user's credit line information and health factor
 */

import { formatUSD, formatPercentage } from '../../../utils/solvency/format-credit.util';
import { HealthFactorBar } from './HealthFactorBar';
import type { OAIDCreditLine } from '../../../types/solvency.types';

interface CreditSummaryCardProps {
  creditData: OAIDCreditLine;
}

export const CreditSummaryCard = ({ creditData }: CreditSummaryCardProps) => {
  const {
    availableCredit,
    creditLimit,
    currentDebt,
    healthFactor,
    collateral,
    interestRate,
    totalInterestAccrued,
  } = creditData;

  // Calculate total collateral value
  const totalCollateralValue = collateral.reduce((sum, pos) => sum + pos.valueUSD, 0);

  // TODO: Credit utilization will be displayed in future version
  // const creditUtilization = creditLimit > 0 ? (currentDebt / creditLimit) * 100 : 0;

  return (
    <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[#111111] mb-2">Your Credit Summary</h2>
        <p className="text-sm text-[#6B7280]">
          Overview of your borrowing capacity and current positions
        </p>
      </div>

      {/* Available Credit - Large Display */}
      <div className="mb-8">
        <div className="text-sm text-[#6B7280] mb-2">Available to Borrow</div>
        <div className="text-[56px] font-bold text-[#111111] leading-none tracking-tight">
          {formatUSD(availableCredit)}
        </div>
        <div className="text-sm text-[#6B7280] mt-2">
          {formatUSD(currentDebt)} of {formatUSD(creditLimit)} used
        </div>
      </div>

      {/* Health Factor */}
      <div className="mb-8">
        <HealthFactorBar
          healthFactor={healthFactor}
          size="large"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
        {/* Total Collateral */}
        <div>
          <div className="text-sm text-[#6B7280] mb-1">Total Collateral</div>
          <div className="text-xl font-semibold text-[#111111]">
            {formatUSD(totalCollateralValue)}
          </div>
        </div>

        {/* Current Debt */}
        <div>
          <div className="text-sm text-[#6B7280] mb-1">Current Debt</div>
          <div className="text-xl font-semibold text-[#111111]">
            {formatUSD(currentDebt)}
          </div>
        </div>

        {/* Interest Rate */}
        <div>
          <div className="text-sm text-[#6B7280] mb-1">Interest Rate</div>
          <div className="text-xl font-semibold text-[#111111]">
            {formatPercentage(interestRate)} APR
          </div>
        </div>

        {/* Interest Accrued */}
        <div>
          <div className="text-sm text-[#6B7280] mb-1">Interest Accrued</div>
          <div className="text-xl font-semibold text-[#111111]">
            {formatUSD(totalInterestAccrued)}
          </div>
        </div>
      </div>

      {/* Collateral Breakdown */}
      {collateral.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="text-sm font-medium text-[#111111] mb-3">Collateral Breakdown</div>
          <div className="space-y-2">
            {collateral.map((col, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 px-3 bg-[#F9FAFB] rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {col.tokenSymbol.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#111111]">{col.tokenSymbol}</div>
                    <div className="text-xs text-[#6B7280]">LTV: {col.ltvRatio}%</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[#111111]">
                    {formatUSD(col.valueUSD)}
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    {col.amount.toLocaleString()} {col.tokenSymbol}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
