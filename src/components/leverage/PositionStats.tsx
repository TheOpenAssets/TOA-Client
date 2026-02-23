
import { Card, CardContent } from '../ui/card';
import { Wallet, TrendingUp, AlertTriangle } from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
  <Card>
    <CardContent className="p-6 flex items-center justify-between space-x-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold">{value}</h2>
          {trend && (
            <span className="text-xs text-green-500 font-medium">
              {trend}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </div>
      <div className="p-3 bg-primary/10 rounded-full">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </CardContent>
  </Card>
);

export const PositionStats = () => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard 
        title="Total Collateral"
        value="$46,500"
        subtext="15.5 stARB Locked"
        icon={Wallet}
        trend="+12%"
      />
      <StatCard 
        title="Total Debt"
        value="$30,500"
        subtext="Avg. 5.0% APR"
        icon={TrendingUp}
      />
      <StatCard 
        title="Avg. Health Factor"
        value="1.52"
        subtext="Safe Zone"
        icon={AlertTriangle}
        trend="Healthy"
      />
    </div>
  );
};
