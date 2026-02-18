// src/pages/public/auth/adminAuth.page.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '../../../components/ui/button';
import { adminService } from '../../../lib/api/admin.service';
import { useAuthStore } from '../../../stores/auth.store';
import { Shield, AlertCircle } from 'lucide-react';
import { useNetwork } from '../../../lib/network/NetworkContext';
import {
  isConnected,
  requestAccess,
  getAddress,
  signMessage
} from "@stellar/freighter-api";

// --- EVM Implementation ---
const EvmAdminAuth = () => {
  const navigate = useNavigate();
  const { networkPath } = useNetwork();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setUser, setLoading, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const challenge = await adminService.getChallenge(address);
      const signature = await signMessageAsync({
        message: challenge.message,
        account: address
      });
      const loginResponse = await adminService.login({
        walletAddress: address,
        message: challenge.message,
        signature,
      });

      setUser(loginResponse.user);
      navigate(networkPath('/admin'));
    } catch (err: any) {
      console.error('Error during admin authentication:', err);
      setError(err.message || 'Admin authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Icon Header */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
          <Shield className="w-8 h-8 text-[#111111]" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="font-geist text-3xl font-medium text-[#111111] mb-2">
          Admin Access (EVM)
        </h1>
        <p className="font-geist text-sm text-[#6B7280]">
          Connect your designated admin wallet to proceed
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">Authentication Error</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Action Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {isConnected ? (
          <div className="space-y-4">
            {/* Connected Address Display */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-[#6B7280] mb-1 font-medium">Connected Wallet</p>
              <p className="text-sm text-[#111111] font-mono truncate">
                {address}
              </p>
            </div>

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-[#111111] hover:bg-[#2c2c2c] text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                'Sign in as Admin'
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-[#6B7280] mb-4">
              Please connect your wallet to continue
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Stellar Implementation ---
const StellarAdminAuth = () => {
  const navigate = useNavigate();
  const { networkPath } = useNetwork();
  const { setUser, setLoading, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  // Check generic connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (await isConnected()) {
          const addrData = await getAddress();
          if (addrData.address) {
            setAddress(addrData.address);
          }
        }
      } catch (e) {
        console.debug("Freighter check failed", e);
      }
    };
    checkConnection();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Check & Request Access
      if (!(await isConnected())) {
        throw new Error("Freighter wallet is not installed.");
      }

      // Need to ensure we have access (getAddress does this implicitly if allowed, or we use requestAccess)
      const allowed = await requestAccess();
      if (!allowed) throw new Error("User denied access to Freighter wallet.");

      const addrData = await getAddress();
      if (!addrData.address) throw new Error("Failed to retrieve Stellar address.");

      const walletAddress = addrData.address;
      setAddress(walletAddress);

      // 2. Get Challenge
      const challenge = await adminService.getChallenge(walletAddress);

      // 3. Sign Message
      const signResponse = await signMessage(challenge.message);
      if (signResponse.error) {
        throw new Error(typeof signResponse.error === 'string' ? signResponse.error : "Failed to sign message");
      }

      let signature = signResponse.signedMessage;
      if (!signature) throw new Error("User denied message signature.");

      // Convert Buffer/Uint8Array to Base64 string if needed (Backend expects Base64 for Stellar)
      if (typeof signature !== 'string') {
        // @ts-ignore
        if (signature.type === 'Buffer' || signature.constructor?.name === 'Buffer' || signature instanceof Uint8Array || Array.isArray(signature)) {
          // @ts-ignore
          const byteArray = signature instanceof Uint8Array ? signature : new Uint8Array(signature);
          let binary = '';
          for (let i = 0; i < byteArray.byteLength; i++) {
            binary += String.fromCharCode(byteArray[i]);
          }
          signature = window.btoa(binary);
        } else {
          signature = signature.toString();
        }
      }

      // 4. Login
      const loginResponse = await adminService.login({
        walletAddress,
        message: challenge.message,
        signature: signature as string,
      });

      setUser(loginResponse.user);
      navigate(networkPath('/admin'));
    } catch (err: any) {
      console.error('Error during Stellar admin authentication:', err);
      setError(err.message || 'Admin authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Icon Header */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
          <Shield className="w-8 h-8 text-[#111111]" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="font-geist text-3xl font-medium text-[#111111] mb-2">
          Admin Access (Stellar)
        </h1>
        <p className="font-geist text-sm text-[#6B7280]">
          Connect your designated admin wallet to proceed
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">Authentication Error</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Action Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-4">
          {/* Connected Address Display (if available) */}
          {address && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-[#6B7280] mb-1 font-medium">Connected Wallet</p>
              <p className="text-sm text-[#111111] font-mono truncate">
                {address}
              </p>
            </div>
          )}

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-[#111111] hover:bg-[#2c2c2c] text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Authenticating...
              </span>
            ) : (
              'Sign in with Freighter'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Main Wrapper ---
const AdminAuthPage = () => {
  const { networkType, networkPath } = useNetwork();

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col items-center justify-center p-8">
      {/* Home Button - Top Left */}
      <div className="absolute top-5 left-5">
        <a
          href={networkPath('/')}
          className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-600"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </a>
      </div>

      {networkType === 'stellar' ? <StellarAdminAuth /> : <EvmAdminAuth />}

      {/* Footer Info */}
      <div className="mt-6 text-center">
        <p className="text-xs text-[#9CA3AF]">
          Only authorized admin wallets can access the admin dashboard
        </p>
      </div>
    </div>
  );
};

export default AdminAuthPage;
