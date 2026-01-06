/**
 * Health Monitor Banner Component
 * Warning banner shown when health factor is below healthy threshold
 */

import { formatHealthFactor } from '../../../utils/solvency/health-factor.util';
import { HEALTH_FACTOR_COLORS } from '../../../constants/solvency.constants';
import type { HealthStatus } from '../../../types/solvency.types';

interface HealthMonitorBannerProps {
  healthStatus: HealthStatus;
  healthFactor: number;
}

export const HealthMonitorBanner = ({
  healthStatus,
  healthFactor,
}: HealthMonitorBannerProps) => {
  const colors = HEALTH_FACTOR_COLORS[healthStatus];

  const getMessage = () => {
    switch (healthStatus) {
      case 'warning':
        return {
          title: '⚠️ Low Health Factor',
          message: 'Your health factor is getting low. Consider adding more collateral or repaying some debt to improve your account health.',
        };
      case 'critical':
        return {
          title: '🚨 Critical Health Factor',
          message: 'Your account is at risk of liquidation! Add collateral or repay debt immediately to avoid losing your assets.',
        };
      default:
        return {
          title: 'Health Alert',
          message: 'Please review your account health.',
        };
    }
  };

  const { title, message } = getMessage();

  return (
    <div
      className={`rounded-[20px] p-6 ${colors.bg} ${colors.border} border-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)]`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${colors.text} mb-1`}>{title}</h3>
          <p className="text-sm text-[#6B7280] mb-2">{message}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6B7280]">Current Health Factor:</span>
            <span className={`text-lg font-bold ${colors.text}`}>
              {formatHealthFactor(healthFactor)}
            </span>
          </div>
        </div>
        {healthStatus === 'critical' && (
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors whitespace-nowrap">
            Take Action
          </button>
        )}
      </div>
    </div>
  );
};
