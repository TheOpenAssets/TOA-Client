// src/pages/public/auth/adminAuth.page.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '../../../components/ui/button';
import { adminService } from '../../../lib/api/admin.service';
import { useAuthStore } from '../../../stores/auth.store';

const AdminAuthPage = () => {
  const navigate = useNavigate();
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
      navigate('/admin');
    } catch (err: any) {
      console.error('Error during admin authentication:', err);
      setError(err.message || 'Admin authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold mb-4">Admin Access</h1>
        <p className="text-gray-400 mb-8">
          Connect your designated admin wallet to proceed.
        </p>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {isConnected ? (
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-white text-black font-bold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {isLoading ? 'Authenticating...' : 'Login as Admin'}
          </Button>
          
        ) : (
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuthPage;
