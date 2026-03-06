import { useState } from 'react';
import { X, Loader2, ExternalLink, CheckCircle, ChevronDown } from 'lucide-react';
import { partnerService } from '../../../lib/api/partner.service';
import { solvencyContractService } from '../../../lib/api/solvency-contract.service';
import type { Partner, PartnerBorrowTerms, PartnerBorrowResponse } from '../../../types/creditcoin.types';
import type { CollateralPosition } from '../../../types/solvency.types';

const LOAN_DURATION = 2592000; // 30 days in seconds
const PARTNER_INSTALLMENTS = 1; // Single installment for partner loans

const usdcToDisplay = (raw: string) => (parseInt(raw) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const displayToUsdc = (val: string) => Math.round(parseFloat(val) * 1_000_000).toString();

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partner: Partner;
  borrowTerms: PartnerBorrowTerms;
  positions: CollateralPosition[];
}

export const PartnerBorrowModal = ({ isOpen, onClose, onSuccess, partner, borrowTerms, positions }: Props) => {
  const [amount, setAmount] = useState('');
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [borrowStep, setBorrowStep] = useState<'vault' | 'partner' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PartnerBorrowResponse | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<CollateralPosition | null>(positions[0] ?? null);
  const [showPositionSelector, setShowPositionSelector] = useState(false);

  const maxUsdc = parseInt(borrowTerms.maxBorrowableUsdc) / 1_000_000;
  const amountNum = parseFloat(amount);
  const isInvalid = isNaN(amountNum) || amountNum <= 0 || amountNum > maxUsdc;

  const handleBorrow = async () => {
    if (isInvalid || !amount || !selectedPosition) return;
    setIsBorrowing(true);
    setBorrowStep('vault');
    setError(null);
    try {
      // Step 1: User signs vault.borrowUSDC() directly on-chain.
      // SolvencyVault enforces msg.sender == position.user, so the user must sign this.
      const amountWei = BigInt(displayToUsdc(amount));
      const positionId = selectedPosition.positionId;
      if (!positionId) throw new Error('Selected position has no positionId');

      const vaultResult = await solvencyContractService.borrowUSDC(
        positionId,
        amountWei,
        LOAN_DURATION,
        PARTNER_INSTALLMENTS,
      );
      if (!vaultResult.success) {
        throw new Error(vaultResult.error || 'Vault borrow transaction failed');
      }

      // Step 2: Notify backend to record loan in partner protocol.
      // Backend uses the vaultTxHash to confirm the on-chain borrow happened,
      // then calls MockPartnerProtocol.recordLoan() via the platform wallet.
      setBorrowStep('partner');
      const res = await partnerService.borrowViaPartner({
        partnerId: partner.partnerId,
        amount: displayToUsdc(amount),
        loanDuration: LOAN_DURATION,
        positionId,
        vaultTxHash: vaultResult.txHash!,
      });
      setResult(res);
    } catch (err: any) {
      const msg: string = err.message || 'Transaction failed. Please try again.';
      if (msg.includes('credit limit')) {
        setError(`Amount exceeds your credit limit. Max: ${maxUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`);
      } else if (msg.includes('solvency position')) {
        setError('This position is no longer active. Please select a different collateral position.');
      } else {
        setError(msg);
      }
    } finally {
      setIsBorrowing(false);
      setBorrowStep(null);
    }
  };

  const handleClose = () => {
    if (isBorrowing) return;
    setAmount('');
    setError(null);
    setResult(null);
    setBorrowStep(null);
    onClose();
  };

  const handleContinue = () => {
    setResult(null);
    setAmount('');
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 font-gellix">Borrow via {partner.partnerName}</h3>
            <p className="text-sm text-gray-500 mt-0.5 font-gellix">USDC will be sent on-chain automatically</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isBorrowing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success state */}
        {result ? (
          <div className="px-6 py-8 space-y-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="text-xl font-semibold text-gray-900 font-gellix">Loan Disbursed</p>
              <p className="text-gray-500 text-sm font-gellix">
                {usdcToDisplay(result.principalAmount)} USDC borrowed via {result.partnerName}
              </p>
            </div>

            {/* Credit boost info */}
            {result.creditBoost?.boosted && (
              <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700 font-gellix">
                Your credit score ({result.creditBoost.tier} · {result.creditBoost.score}) gave you{' '}
                <span className="font-semibold">{result.creditBoost.appliedLtv / 100}% LTV</span>{' '}
                (standard would be {result.creditBoost.standardLtv / 100}%)
              </div>
            )}

            {/* On-chain tx links */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider font-gellix">On-chain transactions</p>
              <TxLink label="Borrow from SolvencyVault" href={result.explorerLinks.borrow} />
              <TxLink label={`Loan recorded in ${result.partnerName}`} href={result.explorerLinks.record} />
            </div>

            <button
              onClick={handleContinue}
              className="w-full bg-gray-900 text-white font-semibold py-3.5 rounded-2xl hover:bg-black transition-colors font-gellix"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-4">
            {/* Credit summary */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 font-gellix">Credit Score</span>
                <span className="text-sm font-semibold text-gray-900 font-gellix">
                  {borrowTerms.compositeScore} · {borrowTerms.tier}
                  {borrowTerms.hasBoost && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Boost Active</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 font-gellix">Applied LTV</span>
                <span className="text-sm font-semibold text-gray-900 font-gellix">{borrowTerms.effectiveLtv / 100}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 font-gellix">Max Borrowable</span>
                <span className="text-sm font-semibold text-gray-900 font-gellix">
                  {maxUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
                </span>
              </div>
            </div>

            {/* Position selector */}
            {positions.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowPositionSelector(v => !v)}
                  disabled={isBorrowing}
                  className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-gellix"
                >
                  <span className="text-gray-500">Collateral Position</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {selectedPosition ? (selectedPosition.tokenSymbol) : 'Select position'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                </button>
                {showPositionSelector && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                    {positions.map(p => (
                      <button
                        key={p.positionId ?? p.tokenAddress}
                        onClick={() => { setSelectedPosition(p); setShowPositionSelector(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 font-gellix ${selectedPosition?.positionId === p.positionId ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}`}
                      >
                        <span className="font-semibold">{p.tokenSymbol}</span>
                        <span className="text-gray-500">${p.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Amount input */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm text-gray-500 font-gellix">Borrow</span>
                <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">$</div>
                  <span className="font-semibold text-gray-900 text-sm font-gellix">USDC</span>
                </div>
              </div>
              <input
                type="text"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                disabled={isBorrowing}
                className="w-full text-4xl font-light text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-400 font-gellix">
                  ${isNaN(amountNum) ? '0.00' : amountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <button
                  onClick={() => setAmount(maxUsdc.toFixed(2))}
                  className="text-xs text-blue-600 font-semibold hover:underline font-gellix"
                >
                  Max
                </button>
              </div>
              {!isNaN(amountNum) && amountNum > maxUsdc && (
                <p className="mt-2 text-sm text-red-600 font-gellix">
                  Exceeds your credit limit ({maxUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC max)
                </p>
              )}
            </div>

            {/* Duration note */}
            <p className="text-xs text-gray-400 text-center font-gellix">Loan duration: 30 days</p>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-sm text-red-600 font-gellix">{error}</p>
              </div>
            )}

            {/* Loading state */}
            {isBorrowing && (
              <div className="bg-gray-50 rounded-2xl p-4 text-center space-y-1">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500 mx-auto" />
                {borrowStep === 'vault' && (
                  <>
                    <p className="text-sm text-gray-600 font-gellix">Step 1/2: Confirm borrow in your wallet...</p>
                    <p className="text-xs text-gray-400 font-gellix">Sign the vault.borrowUSDC() transaction</p>
                  </>
                )}
                {borrowStep === 'partner' && (
                  <>
                    <p className="text-sm text-gray-600 font-gellix">Step 2/2: Registering with partner protocol...</p>
                    <p className="text-xs text-gray-400 font-gellix">Recording loan on Creditcoin testnet</p>
                  </>
                )}
              </div>
            )}

            {/* Borrow button */}
            <button
              onClick={handleBorrow}
              disabled={isBorrowing || isInvalid || !amount || !selectedPosition}
              className="w-full bg-gradient-to-r from-pink-100 to-pink-50 hover:from-pink-200 hover:to-pink-100 disabled:from-gray-100 disabled:to-gray-50 text-pink-600 disabled:text-gray-400 font-semibold text-lg py-4 rounded-3xl transition-all disabled:cursor-not-allowed font-gellix"
            >
              {isBorrowing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                </span>
              ) : (
                'Borrow now'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TxLink = ({ label, href }: { label: string; href: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-600 font-gellix">{label}</span>
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-gellix"
    >
      View on Explorer <ExternalLink className="w-3 h-3" />
    </a>
  </div>
);
