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
    info('Requesting USDC...', 'The faucet is processing your request.');
    try {
      const response = await faucetService.getUsdcFromFaucet(address);
      success('USDC Received!', `${response.amount} USDC sent to your wallet.`);
      setFaucetResult(response);
    } catch (err: unknown) {
      const error = err as Error;
      toastError('Faucet Error', error.message);
    } finally {
      setIsLoadingUsdc(false);
    }
  };

  const handleGetMeth = () => {
    // As per instructions, this button is not functional yet.
    setIsLoadingMeth(true);
    info('METH Faucet', 'This faucet is not yet available.');
    setTimeout(() => setIsLoadingMeth(false), 1000);
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
              {faucetResult && (
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
                Receive 0.1 testnet METH for gas fees. (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGetMeth} disabled={true} className="cta-button w-full">
                {isLoadingMeth ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
                ) : (
                  'Get 0.1 METH'
                )}
              </Button>
               <p className="text-xs text-center text-muted-foreground mt-2">This faucet is currently disabled.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default FaucetPage;
