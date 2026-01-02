import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../../hooks/useToast';
import { Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { faucetService } from '../../lib/api/faucet.service';
import type { Address } from 'viem';

interface TokenFaucetCardProps {
  tokenName: 'USDC' | 'mETH';
  tokenSymbol: 'USDC' | 'mETH';
  tokenDecimals: number;
  tokenImage: string;
  tokenAddress: string;
  faucetAmount: number;
  description: string;
}

interface FaucetResult {
  message: string;
  amount: string;
  transactionHash: string;
  explorerUrl: string;
  symbol?: string;
}

export const TokenFaucetCard = ({
  tokenName,
  tokenSymbol,
  tokenDecimals,
  tokenImage,
  tokenAddress,
  faucetAmount,
  description,
}: TokenFaucetCardProps) => {
  const { address } = useAccount();
  const { success, error: toastError, info } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [faucetResult, setFaucetResult] = useState<FaucetResult | null>(null);

  const { data: balance } = useBalance({
    address,
    token: tokenAddress as Address,
  });

  const handleGetToken = async () => {
    if (!address) {
      toastError('Wallet not connected', 'Please connect your wallet to use the faucet.');
      return;
    }

    setIsLoading(true);
    setFaucetResult(null);

    try {
      if (!balance || balance.value === 0n) {
        info(`Adding ${tokenName} Token...`, `Please approve adding ${tokenName} to your wallet.`);
        try {
          await window.ethereum?.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: tokenAddress,
                symbol: tokenSymbol,
                decimals: tokenDecimals,
                image: tokenImage,
              },
            },
          });
        } catch (tokenError) {
          console.log('Token add skipped:', tokenError);
        }
      }

      info(`Requesting ${tokenName}...`, 'The faucet is processing your request.');
      const response =
        tokenName === 'USDC'
          ? await faucetService.getUsdcFromFaucet(address)
          : await faucetService.getMethFromFaucet(address);
      success(`${tokenName} Received!`, `${response.amount} ${tokenName} sent to your wallet.`);
      setFaucetResult({ ...response, symbol: tokenSymbol });
    } catch (err: unknown) {
      const error = err as Error;
      toastError('Faucet Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800/40 border-black/[0.1] dark:border-white/[0.2] border shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle>{tokenName} Faucet</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGetToken} disabled={isLoading || !address} className="cta-button w-full">
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
          ) : (
            `Get ${faucetAmount} ${tokenName}`
          )}
        </Button>
        {faucetResult && faucetResult.symbol === tokenSymbol && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-800">{faucetResult.message}</p>
            </div>
            <p><span className="font-medium">Amount:</span> {faucetResult.amount} {tokenSymbol}</p>
            <p className="truncate"><span className="font-medium">TX Hash:</span> {faucetResult.transactionHash}</p>
            <a href={faucetResult.explorerUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-green-700 hover:text-green-800 font-medium">
              View on Explorer <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
