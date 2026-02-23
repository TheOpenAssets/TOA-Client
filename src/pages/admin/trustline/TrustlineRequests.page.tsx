import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { trustlineService } from '../../../lib/api/trustline.service';
import type { TrustlineRequest } from '../../../lib/api/trustline.service';
import { useAuthStrategy } from '../../../lib/auth/AuthStrategyContext';
import { PageLoader } from '../../../components/ui/page-loader';

export default function TrustlineRequestsPage() {
    const [requests, setRequests] = useState<TrustlineRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const { address } = useAuthStrategy();

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const data = await trustlineService.getAdminRequests({ status: 'PENDING' });
            // API returns { requests: TrustlineRequest[]; totalCount: number; ... }
            setRequests(data.requests || []);
        } catch (error) {
            console.error('Failed to fetch trustline requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (request: TrustlineRequest) => {
        if (!address) return;

        try {
            setIsProcessing(request.requestId);
            console.log(`Approving request ${request.requestId}...`);

            await trustlineService.approveTrustline({
                requestId: request.requestId,
                adminWallet: address,
            });

            // Refresh list
            await fetchRequests();
        } catch (error) {
            console.error('Failed to approve trustline:', error);
            alert('Failed to approve trustline. See console for details.');
        } finally {
            setIsProcessing(null);
        }
    };

    if (isLoading) {
        return <PageLoader />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Trustline Requests</h2>
                    <p className="text-muted-foreground">Approve investor trustlines for Stellar assets</p>
                </div>
                <Button onClick={fetchRequests} variant="outline">
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Investor</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Asset Code</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Asset ID</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.length === 0 ? (
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td colSpan={6} className="p-4 align-middle text-center text-muted-foreground">
                                            No pending trustline requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((request) => (
                                        <tr key={request.requestId} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle">{new Date(request.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4 align-middle font-mono text-xs">{request.investorAddress}</td>
                                            <td className="p-4 align-middle">{request.assetCode || 'N/A'}</td>
                                            <td className="p-4 align-middle font-mono text-xs">{request.assetId}</td>
                                            <td className="p-4 align-middle">
                                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                                    {request.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(request)}
                                                    disabled={isProcessing === request.requestId}
                                                >
                                                    {isProcessing === request.requestId ? 'Approving...' : 'Approve'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
