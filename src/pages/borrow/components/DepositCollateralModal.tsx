/**
 * Deposit Collateral Modal Component
 * Modal for depositing collateral to create/increase credit line
 * TODO: Full implementation in next step
 */

interface DepositCollateralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DepositCollateralModal = ({
  isOpen,
  onClose,
  onSuccess: _onSuccess,  // TODO: Will be used in full implementation
}: DepositCollateralModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[20px] p-8 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-[#111111] mb-4">
          Deposit Collateral
        </h2>
        <p className="text-[#6B7280] mb-6">
          Deposit collateral modal implementation coming next...
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-[#111111] hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
