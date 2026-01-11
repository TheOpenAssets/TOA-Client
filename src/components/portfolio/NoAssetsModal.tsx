// src/components/portfolio/NoAssetsModal.tsx
import { useNavigate } from 'react-router-dom';
import { Lock, Upload, ShoppingCart, Info, X } from 'lucide-react';

interface NoAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NoAssetsModal = ({ isOpen, onClose }: NoAssetsModalProps) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-lg border p-4">
      <div
        className="rounded-2xl p-8 max-w-2xl w-full bg-transparent border-neutral-300 border"
        style={{
          boxShadow: `
            4px 4px 12px rgba(243, 244, 245, 0.08),
            8px 8px 24px rgba(150, 151, 151, 0.06),
            12px 12px 36px rgba(92, 92, 93, 0.04),
            16px 16px 48px rgba(45, 46, 47, 0.02)
          `,
        }}
      >
        <div className="text-center relative">
          <button
            onClick={onClose}
            className="absolute -top-4 -right-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-gray-700" />
          </div>
          <h2 className="font-gellix text-xl font-semibold text-foreground mb-2">
            Get Started with Borrowing
          </h2>
          <p className="font-inter text-sm text-gray-600 mb-8">
            To increase your credit limit, you need RWA tokens to use as collateral. Choose an option below to get started:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
            <div
              className="bg-gray-100 rounded-xl p-6 hover:bg-gray-200 transition-colors cursor-pointer"
              onClick={() => { navigate('/issuers'); onClose(); }}
            >
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mb-4">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-gellix text-lg font-semibold text-foreground mb-2">
                Deposit Private Assets
              </h3>
              <p className="font-inter text-sm text-gray-600">
                Tokenize your real-world assets to use as collateral.
              </p>
            </div>
            <div
              className="bg-gray-100 rounded-xl p-6 hover:bg-gray-200 transition-colors cursor-pointer"
              onClick={() => { navigate('/marketplace'); onClose(); }}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mb-4">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-gellix text-lg font-semibold text-foreground mb-2">
                Buy from Marketplace
              </h3>
              <p className="font-inter text-sm text-gray-600">
                Purchase tokenized assets from other users.
              </p>
            </div>
          </div>
          <div className="bg-gray-100 rounded-xl p-4 flex items-start gap-3 text-left">
            <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <p className="font-inter text-xs text-gray-700">
              <strong>How it works:</strong> Once you have RWA tokens in your portfolio, you can deposit them as collateral to increase your credit limit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
