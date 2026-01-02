import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { faucetService } from '../../lib/api/faucet.service';
import { useToast } from '../../hooks/useToast';
import { Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import AppLayout from '../../app/layouts/AppLayout';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface FaucetResult {
  message: string;
  amount: string;
  transactionHash: string;
  explorerUrl: string;
  symbol?: string;
}

const FaucetPage = () => {
  const { address } = useAccount();
  const { success, error: toastError, info } = useToast();
  const [isLoadingUsdc, setIsLoadingUsdc] = useState(false);
  const [isLoadingMeth, setIsLoadingMeth] = useState(false);
  const [faucetResult, setFaucetResult] = useState<FaucetResult | null>(null);

  const handleGetUsdc = async () => {
    if (!address) {
      toastError('Wallet not connected', 'Please connect your wallet to use the faucet.');
      return;
    }

    setIsLoadingUsdc(true);
    setFaucetResult(null); // Clear previous result
    
    try {
      // First, try to add the USDC token to the wallet
      info('Adding USDC Token...', 'Please approve adding USDC to your wallet.');
      
      const usdcAddress = '0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238';
      
      try {
        await window.ethereum?.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: usdcAddress,
              symbol: 'USDC',
              decimals: 6,
              image: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
            },
          },
        });
      } catch (tokenError) {
        // User rejected or token already added, continue anyway
        console.log('Token add skipped:', tokenError);
      }

      // Now request from faucet
      info('Requesting USDC...', 'The faucet is processing your request.');
      const response = await faucetService.getUsdcFromFaucet(address);
      success('USDC Received!', `${response.amount} USDC sent to your wallet.`);
      setFaucetResult({ ...response, symbol: 'USDC' });
    } catch (err: unknown) {
      const error = err as Error;
      toastError('Faucet Error', error.message);
    } finally {
      setIsLoadingUsdc(false);
    }
  };

  const handleGetMeth = async () => {
    if (!address) {
      toastError('Wallet not connected', 'Please connect your wallet to use the faucet.');
      return;
    }

    setIsLoadingMeth(true);
    setFaucetResult(null); // Clear previous result
    info('Requesting mETH...', 'The faucet is processing your request.');
    try {
      const response = await faucetService.getMethFromFaucet(address);
      success('mETH Received!', `${response.amount} mETH sent to your wallet.`);
      setFaucetResult({ ...response, symbol: 'mETH' });
    } catch (err: unknown) {
      const error = err as Error;
      toastError('Faucet Error', error.message);
    } finally {
      setIsLoadingMeth(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-12 px-4">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Testnet Faucet</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Get testnet tokens to interact with the platform.
          </p>
          {!address && (
            <div className="mt-6 flex justify-center">
              <ConnectButton />
            </div>
          )}
        </header>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* USDC Faucet Card */}
          <Card>
            <CardHeader>
              <CardTitle>USDC Faucet</CardTitle>
              <CardDescription>
                Receive 1,000 testnet USDC to your connected wallet. 
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGetUsdc} disabled={isLoadingUsdc || !address} className="cta-button w-full">
                {isLoadingUsdc ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
                ) : (
                  'Get 1,000 USDC'
                )}
              </Button>
              {faucetResult && faucetResult.symbol === 'USDC' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-semibold text-green-800">{faucetResult.message}</p>
                  </div>
                  <p><span className="font-medium">Amount:</span> {faucetResult.amount} USDC</p>
                  <p className="truncate"><span className="font-medium">TX Hash:</span> {faucetResult.transactionHash}</p>
                  <a href={faucetResult.explorerUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-green-700 hover:text-green-800 font-medium">
                    View on Explorer <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* METH Faucet Card */}
          <Card>
            <CardHeader>
              <CardTitle>METH Faucet</CardTitle>
              <CardDescription>
                Receive 10 testnet mETH for for leveraged meth buy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGetMeth} disabled={isLoadingMeth || !address} className="cta-button w-full">
                {isLoadingMeth ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
                ) : (
                  'Get 10 mETH'
                )}
              </Button>
              {faucetResult && faucetResult.symbol === 'mETH' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-semibold text-green-800">{faucetResult.message}</p>
                  </div>
                  <p><span className="font-medium">Amount:</span> {faucetResult.amount} mETH</p>
                  <p className="truncate"><span className="font-medium">TX Hash:</span> {faucetResult.transactionHash}</p>
                  <a href={faucetResult.explorerUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-green-700 hover:text-green-800 font-medium">
                    View on Explorer <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default FaucetPage;
