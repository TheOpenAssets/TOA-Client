// src/components/portfolio/MiniAreaChart.tsx
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface MiniAreaChartProps {
  data: Array<{ timestamp: number; value: number }>;
  gradient: {
    id: string;
    color: string;
    startOpacity: number;
    endOpacity: number;
  };
  strokeColor: string;
  strokeWidth?: number;
}

export const MiniAreaChart = ({
  data,
  gradient,
  strokeColor,
  strokeWidth = 2
}: MiniAreaChartProps) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="absolute bottom-6 right-6 w-[350px] h-[150px] opacity-80 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradient.id} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={gradient.color}
                stopOpacity={gradient.startOpacity}
              />
              <stop
                offset="95%"
                stopColor={gradient.color}
                stopOpacity={gradient.endOpacity}
              />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill={`url(#${gradient.id})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
