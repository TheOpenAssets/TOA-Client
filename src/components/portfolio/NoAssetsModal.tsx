// src/components/portfolio/NoAssetsModal.tsx
import { useNavigate } from 'react-router-dom';
import { Lock, Upload, ShoppingCart, Info, X } from 'lucide-react';
import { Button } from '../ui/button';

interface NoAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NoAssetsModal = ({ isOpen, onClose }: NoAssetsModalProps) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-2xl w-full mx-4 bg-white rounded-2xl p-8 shadow-lg relative">
        <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-4 right-4">
          <X className="w-5 h-5 text-gray-500" />
        </Button>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
            Get Started with Borrowing
          </h2>
          <p className="text-gray-600 mb-8">
            To increase your credit limit, you need RWA tokens to use as collateral. Choose an option below to get started:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
            <div
              className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => { navigate('/issuers'); onClose(); }}
            >
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mb-4">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Deposit Private Assets
              </h3>
              <p className="text-sm text-gray-600">
                Tokenize your real-world assets to use as collateral.
              </p>
            </div>
            <div
              className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => { navigate('/marketplace'); onClose(); }}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mb-4">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Buy from Marketplace
              </h3>
              <p className="text-sm text-gray-600">
                Purchase tokenized assets from other users.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-left bg-blue-50 rounded-lg p-4">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>How it works:</strong> Once you have RWA tokens in your portfolio, you can deposit them as collateral to increase your credit limit.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
