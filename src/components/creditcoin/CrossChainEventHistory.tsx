// src/components/creditcoin/CrossChainEventHistory.tsx

import { useState, useEffect } from 'react';
import { creditcoinService } from '../../lib/api/creditcoin.service';
import type { USCEvent } from '../../types/creditcoin.types';

interface CrossChainEventHistoryProps {
  walletAddress: string;
}

const CHAIN_DISPLAY: Record<string, string> = {
  ETHEREUM: 'Ethereum',
  BSC: 'BSC',
  BITCOIN: 'Bitcoin',
};

const EVENT_DISPLAY: Record<string, string> = {
  REPAYMENT: 'Repayment',
  DEFAULT: 'Default',
  STAKE: 'Stake',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export const CrossChainEventHistory = ({ walletAddress }: CrossChainEventHistoryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<USCEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Reset fetch state whenever the wallet address changes so the new
  // wallet's events are loaded rather than re-using the previous wallet's data.
  useEffect(() => {
    setHasFetched(false);
    setEvents([]);
    setError(null);
  }, [walletAddress]);

  useEffect(() => {
    if (!isOpen || hasFetched || !walletAddress) return;

    const fetchEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await creditcoinService.getUSCEvents(walletAddress);
        setEvents(response.events ?? []);
        setHasFetched(true);
      } catch (err: any) {
        setError(err.message || 'Failed to load cross-chain events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [isOpen, walletAddress, hasFetched]);

  return (
    <div
      className="bg-transparent rounded-2xl border border-gray-300 overflow-hidden"
      style={{
        boxShadow: `
          4px 4px 12px rgba(243, 244, 245, 0.08),
          8px 8px 24px rgba(150, 151, 151, 0.06),
          12px 12px 36px rgba(92, 92, 93, 0.04),
          16px 16px 48px rgba(45, 46, 47, 0.02)
        `,
      }}
    >
      {/* Toggle header */}
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="font-gellix text-sm font-medium text-gray-700">
          Verified Cross-Chain Events
        </span>
        <span className="text-gray-400 text-xs select-none">
          {isOpen ? '▲ Collapse' : '▼ Expand'}
        </span>
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div className="border-t border-gray-200 px-6 py-4">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-3 bg-gray-200 rounded w-10" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                  <div className="h-3 bg-gray-200 rounded w-14" />
                </div>
              ))}
            </div>
          )}

          {error && !isLoading && (
            <p className="font-gellix text-xs text-red-500">{error}</p>
          )}

          {!isLoading && !error && events.length === 0 && (
            <p className="font-gellix text-xs text-gray-500">
              No cross-chain events verified yet. Submit a proof above to get started.
            </p>
          )}

          {!isLoading && !error && events.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="font-gellix font-medium text-left pb-2 pr-4">Source Chain</th>
                    <th className="font-gellix font-medium text-left pb-2 pr-4">Event Type</th>
                    <th className="font-gellix font-medium text-left pb-2 pr-4">Score Impact</th>
                    <th className="font-gellix font-medium text-left pb-2 pr-4">Verified</th>
                    <th className="font-gellix font-medium text-left pb-2">Explorer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {events.map((event, idx) => (
                    <tr key={`${event.txHash}-${idx}`} className="hover:bg-gray-50 transition-colors">
                      <td className="font-gellix text-gray-700 py-2.5 pr-4">
                        {CHAIN_DISPLAY[event.sourceChain] ?? event.sourceChain}
                      </td>
                      <td className="font-gellix text-gray-700 py-2.5 pr-4">
                        {EVENT_DISPLAY[event.eventType] ?? event.eventType}
                      </td>
                      <td
                        className={`font-gellix font-semibold py-2.5 pr-4 ${
                          event.scoreDelta >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {event.scoreDelta >= 0 ? `+${event.scoreDelta}` : `\u2212${Math.abs(event.scoreDelta)}`}
                      </td>
                      <td className="font-gellix text-gray-500 py-2.5 pr-4">
                        {formatDate(event.verifiedAt)}
                      </td>
                      <td className="py-2.5">
                        <a
                          href={`https://creditcoin-testnet.blockscout.com/tx/${event.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-gellix text-blue-500 hover:text-blue-700 hover:underline transition-colors"
                        >
                          View tx →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
