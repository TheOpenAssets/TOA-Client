import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TokenFaucetCard } from '../../components/faucet/TokenFaucetCard';
import { Wavy } from '../../components/ui/wavy';
import { CONTRACTS } from '../../lib/blockchain/auction.contract';

const FaucetPage = () => {
  const { address } = useAccount();
  return (
    <div className="min-h-screen bg-transparent mx-auto">
      <Wavy />
      {/* Top Navigation Bar - Clean Marketplace Design */}
      <div className='absolute top-10 left-10 border border-neutral-200 shadow-lg rounded-full p-2 hover:border-neutral-500 z-200' onClick={() => window.history.back()}>
        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>

      </div>
      {/* Main Content */}
      <div className=" absolute top-0 left-0 w-full mx-auto z-100 flex flex-col items-center ">
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
              tokenImage="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png"
              tokenAddress={CONTRACTS.USDC}
              faucetAmount={1000}
              description="Receive 1,000 testnet USDC to your connected wallet."
            />



          </div>
        )}
      </div>
    </div>
  );
};

export default FaucetPage;
