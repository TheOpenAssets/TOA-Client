import { useAccount } from 'wagmi';
import AppLayout from '../../app/layouts/AppLayout';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TokenFaucetCard } from '../../components/faucet/TokenFaucetCard';

const FaucetPage = () => {
  const { address } = useAccount();

  return (
    <AppLayout>
      <div className="container mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Testnet Faucet</h1>
          <p className="text-muted-foreground mt-3 text-xl">
            Get testnet tokens to interact with the platform.
          </p>
          {!address && (
            <div className="mt-8 flex justify-center">
              <ConnectButton />
            </div>
          )}
        </header>
        
        {address && (
          <div className="w-full max-w-md space-y-8">
            <TokenFaucetCard
              tokenName="USDC"
              tokenSymbol="USDC"
              tokenDecimals={6}
              tokenImage="https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
              tokenAddress="0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238"
              faucetAmount={1000}
              description="Receive 1,000 testnet USDC to your connected wallet."
            />
            <TokenFaucetCard
              tokenName="mETH"
              tokenSymbol="mETH"
              tokenDecimals={18}
              tokenImage="https://raw.githubusercontent.com/mantle-network/mantle-token-lists/main/src/assets/token-logos/meth.png"
              // TODO: Replace with actual mETH contract address
              tokenAddress="0x4Ade8aAa0143526393EcadA836224EF21aBC6ac6" 
              faucetAmount={10}
              description="Receive 10 testnet mETH for leveraged buy."
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default FaucetPage;
