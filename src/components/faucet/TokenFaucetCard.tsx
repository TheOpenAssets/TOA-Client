import { useState } from 'react';
import { useAccount, useBalance, useWriteContract } from 'wagmi';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/useToast';
import { Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { USDC_ABI, STARB_ABI } from '../../lib/blockchain/auction.contract';
import { parseUnits } from 'viem';
import type { Address } from 'viem';

interface TokenFaucetCardProps {
  tokenName: 'USDC' | 'stARB';
  tokenSymbol: 'USDC' | 'stARB';
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

  const { writeContractAsync } = useWriteContract();

  const handleGetToken = async () => {
    if (!address) {
      toastError('Wallet not connected', 'Please connect your wallet to use the faucet.');
      return;
    }

    setIsLoading(true);
    setFaucetResult(null);

    try {
      // Check if token exists and has balance
      const hasBalance = balance && balance.value > 0n;

      if (!hasBalance) {
        // Only add token if balance is 0 or token doesn't exist
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
              },
            },
          });
        } catch (tokenError) {
          console.log('Token add skipped or already exists:', tokenError);
        }
      }

      if (tokenName === 'USDC') {
        // Call faucet() directly on the MockUSDC contract
        info(`Requesting ${tokenName}...`, 'Please confirm the transaction in your wallet.');
        const txHash = await writeContractAsync({
          address: tokenAddress as Address,
          abi: USDC_ABI,
          functionName: 'faucet',
        });
        success(`${tokenName} Received!`, `1000 ${tokenName} sent to your wallet.`);
        setFaucetResult({
          message: `Successfully received 1000 ${tokenName}`,
          amount: '1000',
          transactionHash: txHash,
          explorerUrl: `https://creditcoin.blockscout.com/tx/${txHash}`,
          symbol: tokenSymbol,
        });
      } else {
        // Call mint(address, amount) directly on the MockStARB contract
        info(`Requesting ${tokenName}...`, 'Please confirm the transaction in your wallet.');
        const mintAmount = parseUnits(faucetAmount.toString(), 18); // stARB has 18 decimals
        const txHash = await writeContractAsync({
          address: tokenAddress as Address,
          abi: STARB_ABI,
          functionName: 'mint',
          args: [address, mintAmount],
        });
        success(`${tokenName} Received!`, `${faucetAmount} ${tokenName} sent to your wallet.`);
        setFaucetResult({
          message: `Successfully received ${faucetAmount} ${tokenName}`,
          amount: faucetAmount.toString(),
          transactionHash: txHash,
          explorerUrl: `https://sepolia.arbiscan.io/tx/${txHash}`,
          symbol: tokenSymbol,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      toastError('Faucet Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-transparent rounded-3xl p-6">
      {/* Card Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
            <img
              src={tokenImage}
              alt={tokenName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png';
              }}
            />
          </div>
          <h2 className="font-geist text-2xl font-medium text-[#111111]">{tokenName} Faucet</h2>
        </div>
        <p className="font-geist text-sm text-[#6B7280]">{description}</p>
      </div>

      {/* Current Balance */}
      {balance && (
        <div className="mb-6 p-4 bg-[#F3F4F6] rounded-2xl">
          <p className="font-geist text-xs text-[#6B7280] mb-1">Current Balance</p>
          <p className="font-geist text-2xl font-medium text-[#111111]">
            {parseFloat(balance.formatted).toFixed(tokenDecimals === 6 ? 2 : 4)} {tokenSymbol}
          </p>
        </div>
      )}

      {/* Get Tokens Button */}
      <Button
        onClick={handleGetToken}
        disabled={isLoading || !address}
        className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          `Get ${faucetAmount.toLocaleString()} ${tokenName}`
        )}
      </Button>

      {/* Success Message */}
      {faucetResult && faucetResult.symbol === tokenSymbol && (
        <div className="mt-6 p-4 bg-green-50 rounded-2xl">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-geist text-sm font-medium text-green-800 mb-2">{faucetResult.message}</p>
              <div className="space-y-1 font-geist text-xs text-green-700">
                <p><span className="font-medium">Amount:</span> {faucetResult.amount} {tokenSymbol}</p>
                <p className="break-all"><span className="font-medium">TX Hash:</span> {faucetResult.transactionHash}</p>
              </div>
              <a
                href={faucetResult.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 font-geist text-xs text-green-700 hover:text-green-800 font-medium transition-colors"
              >
                View on Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
