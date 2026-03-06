/**
 * USCProofModal
 *
 * Modal for submitting cross-chain USC (Universal Staking Credential) proofs.
 * Follows the same modal pattern as RepayLoanModal (fixed inset-0 backdrop + centered card).
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { creditcoinService } from '../../lib/api/creditcoin.service';
import type { SubmitProofDto } from '../../types/creditcoin.types';

interface USCProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onProofSubmitted: () => void; // called after successful submission to trigger score refresh
}

const DEMO_VALUES = {
  sourceChain: 'ETHEREUM' as const,
  eventType: 'REPAYMENT' as const,
  scoreDelta: 80,
  txHash: '0xdemo1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
  proofData: '0xdeadbeef01020304',
};

const inputClass =
  'w-full rounded-md border border-slate-200 bg-gray-100 px-3 py-2 text-sm text-slate-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

const selectClass =
  'w-full rounded-md border border-slate-200 bg-gray-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-neutral-400 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

export const USCProofModal = ({
  isOpen,
  onClose,
  walletAddress,
  onProofSubmitted,
}: USCProofModalProps) => {
  const [sourceChain, setSourceChain] = useState<SubmitProofDto['sourceChain']>('ETHEREUM');
  const [eventType, setEventType] = useState<SubmitProofDto['eventType']>('REPAYMENT');
  const [scoreDelta, setScoreDelta] = useState<string>('');
  const [txHash, setTxHash] = useState('');
  const [proofData, setProofData] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoadDemo = () => {
    setSourceChain(DEMO_VALUES.sourceChain);
    setEventType(DEMO_VALUES.eventType);
    setScoreDelta(String(DEMO_VALUES.scoreDelta));
    setTxHash(DEMO_VALUES.txHash);
    setProofData(DEMO_VALUES.proofData);
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    // Reset form state
    setSourceChain('ETHEREUM');
    setEventType('REPAYMENT');
    setScoreDelta('');
    setTxHash('');
    setProofData('');
    setError(null);
    setSuccessTxHash(null);
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    const parsedDelta = parseFloat(scoreDelta);
    if (isNaN(parsedDelta)) {
      setError('Score Delta must be a valid number.');
      return;
    }
    if (!txHash.trim()) {
      setError('Transaction Hash is required.');
      return;
    }
    if (!proofData.trim()) {
      setError('Proof Data is required.');
      return;
    }

    const dto: SubmitProofDto = {
      walletAddress,
      sourceChain,
      eventType,
      scoreDelta: parsedDelta,
      txHash: txHash.trim(),
      proofData: proofData.trim(),
    };

    setIsSubmitting(true);
    try {
      const response = await creditcoinService.submitUSCProof(dto);
      setSuccessTxHash(response.txHash);
      // After 5 seconds, invoke the callback to refresh the credit score
      setTimeout(() => {
        onProofSubmitted();
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent z-[9999] flex items-center justify-center backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-gray-200 overflow-hidden flex flex-col shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="px-8 pt-8 pb-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight font-geist">
              Submit USC Proof
            </h2>
            <p className="text-slate-500 text-xs font-geist mt-1">
              Submit a cross-chain credit event proof
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group disabled:opacity-50"
          >
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          {successTxHash ? (
            /* Success State */
            <div className="py-8 text-center space-y-3">
              <p className="text-slate-800 font-semibold font-geist text-sm">
                Proof submitted. Verification transaction:{' '}
                <a
                  href={`https://creditcoin-testnet.blockscout.com/tx/${successTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline break-all"
                >
                  {successTxHash}
                </a>
              </p>
              <p className="text-slate-500 text-xs font-geist">Refreshing your score...</p>
            </div>
          ) : (
            /* Form */
            <div className="space-y-5">
              {/* Source Chain */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Source Chain
                </label>
                <select
                  value={sourceChain}
                  onChange={(e) => setSourceChain(e.target.value as SubmitProofDto['sourceChain'])}
                  disabled={isSubmitting}
                  className={selectClass}
                >
                  <option value="ETHEREUM">Ethereum</option>
                  <option value="BSC">BSC</option>
                  <option value="BITCOIN">Bitcoin</option>
                </select>
              </div>

              {/* Event Type */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as SubmitProofDto['eventType'])}
                  disabled={isSubmitting}
                  className={selectClass}
                >
                  <option value="REPAYMENT">Repayment</option>
                  <option value="DEFAULT">Default</option>
                  <option value="STAKE">Stake</option>
                </select>
              </div>

              {/* Score Delta */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Score Impact{' '}
                  <span className="normal-case font-normal text-slate-500">
                    (positive for repayment/stake, negative for default)
                  </span>
                </label>
                <input
                  type="number"
                  value={scoreDelta}
                  onChange={(e) => setScoreDelta(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 80 or -30"
                  className={inputClass}
                />
              </div>

              {/* Transaction Hash */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Transaction Hash
                </label>
                <p className="text-[11px] text-slate-400">
                  Transaction hash on the source chain being proven
                </p>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="0x..."
                  className={inputClass}
                />
              </div>

              {/* Proof Data */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Proof Data
                </label>
                <p className="text-[11px] text-slate-400">Raw hex proof bytes</p>
                <textarea
                  value={proofData}
                  onChange={(e) => setProofData(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="0x..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                  <p className="text-xs font-semibold text-rose-600">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!successTxHash && (
          <div className="px-8 py-6 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadDemo}
                disabled={isSubmitting}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Load demo proof
              </button>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 hover:shadow-xl active:scale-95 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Proof'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
