/**
 * Health Factor Bar Component
 * Visual indicator of account health with color coding
 */

import { getHealthStatus, formatHealthFactor } from '../../../utils/solvency/health-factor.util.ts';
import { HEALTH_FACTOR_COLORS, SOLVENCY_CONFIG } from '../../../constants/solvency.constants.ts';

interface HealthFactorBarProps {
    healthFactor: number;
    size?: 'small' | 'large';
}

export const HealthFactorBar = ({ healthFactor, size = 'small' }: HealthFactorBarProps) => {
    const status = getHealthStatus(healthFactor);
    const colors = HEALTH_FACTOR_COLORS[status];

    // Calculate percentage for visual bar (capped at 200%)
    const displayPercentage = Math.min((healthFactor / 200) * 100, 100);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className={`${size === 'large' ? 'text-base' : 'text-sm'} font-medium text-[#111111]`}>
                    Health Factor
                </span>
                <span className={`${size === 'large' ? 'text-2xl' : 'text-lg'} font-bold ${colors.text}`}>
                    {formatHealthFactor(healthFactor)}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${colors.bar}`}
                    style={{ width: `${displayPercentage}%` }}
                />
            </div>

            {/* Threshold Markers */}
            <div className="flex items-center justify-between text-xs text-[#6B7280]">
                <span>Liquidation</span>
                <span className="text-[#111111] font-medium">
                    {healthFactor >= SOLVENCY_CONFIG.healthThresholds.WARNING
                        ? 'Healthy'
                        : healthFactor >= SOLVENCY_CONFIG.healthThresholds.WARNING
                            ? 'Warning'
                            : 'Critical'}
                </span>
                <span>Safe</span>
            </div>

            {/* Status Message */}
            {size === 'large' && (
                <div className={`text-sm ${colors.text} font-medium mt-2`}>
                    {status === 'healthy' && 'Your account is healthy. You can safely borrow more.'}
                    {status === 'warning' && 'Your health factor is getting low. Consider adding collateral.'}
                    {status === 'critical' && 'Critical! Add collateral or repay debt to avoid liquidation.'}
                </div>
            )}
        </div>
    );
};