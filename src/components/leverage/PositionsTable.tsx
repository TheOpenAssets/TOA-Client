import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { useLeverageStore } from '../../stores/leverage.store';
import { formatUnits } from 'viem';

export const PositionsTable = () => {
  const { positions, fetchMyPositions, isLoading } = useLeverageStore();

  useEffect(() => {
    fetchMyPositions();
  }, [fetchMyPositions]);

  const getHealthColor = (health: number) => {
    if (health >= 1.4) return 'text-green-500';
    if (health >= 1.15) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'HEALTHY': return <Badge variant="secondary" className="bg-green-500/15 text-green-500 hover:bg-green-500/25">Healthy</Badge>;
      case 'WARNING': return <Badge variant="secondary" className="bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25">Warning</Badge>;
      case 'CRITICAL': return <Badge variant="destructive">Critical</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Active Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Collateral</TableHead>
              <TableHead>Debt</TableHead>
              <TableHead>Health Factor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((pos) => {
              const health = pos.currentHealthFactor / 10000;
              const collateral = formatUnits(BigInt(pos.mETHCollateral), 18);
              const debt = formatUnits(BigInt(pos.usdcBorrowed), 6);

              return (
                <TableRow key={pos.positionId}>
                  <TableCell className="font-medium">{pos.assetSymbol || pos.assetId.substring(0,8)}</TableCell>
                  <TableCell>{parseFloat(collateral).toFixed(2)} mETH</TableCell>
                  <TableCell>${parseFloat(debt).toLocaleString()} USDC</TableCell>
                  <TableCell className={`font-mono font-bold ${getHealthColor(health)}`}>
                    {health.toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(pos.healthStatus)}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer underline">
                      Details
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {!isLoading && positions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No active leverage positions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
