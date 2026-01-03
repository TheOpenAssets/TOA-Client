import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TokenFaucetCard } from '../../components/faucet/TokenFaucetCard';

const FaucetPage = () => {
  const { address } = useAccount();
  return (
    <div className="min-h-screen bg-white/5 max-w-[85vw] mx-auto">
      {/* Top Navigation Bar - Clean Marketplace Design */}
      <div className='absolute top-5 left-5'>
      <a href="/" className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </a>
      
      </div>
      {/* Main Content */}
      <div className="w-full mx-auto z-40 flex flex-col items-center ">
        {/* Page Header */}
        <div className="text-center mb-12 max-w-2xl mt-20">
          <h1 className="font-geist text-4xl font-medium text-[#111111] mb-3">Testnet Faucet</h1>
          <p className="font-geist text-base text-[#6B7280]">
            Get testnet tokens to interact with the platform.
          </p>
          {!address && (
            <div className="mt-8 flex justify-center">
              <ConnectButton />
            </div>
          )}
        </div>

        {address && (
          <div className="w-full max-w-2xl space-y-6">
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
              tokenImage="/public/meth-crystal.svg"
              tokenAddress="0x4Ade8aAa0143526393EcadA836224EF21aBC6ac6"
              faucetAmount={10}
              description="Receive 10 testnet mETH for leveraged buy."
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FaucetPage;
