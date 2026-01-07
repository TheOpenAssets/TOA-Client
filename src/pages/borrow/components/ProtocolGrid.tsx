/**
 * Protocol Grid Component
 * Displays available protocols in a responsive grid
 */

import { ProtocolCard } from './ProtocolCard';
import type { Protocol } from '../../../types/solvency.types';

interface ProtocolGridProps {
  protocols: Protocol[];
  onBorrow: (protocol: Protocol) => void;
  disabled?: boolean;
}

export const ProtocolGrid = ({ protocols, onBorrow, disabled = false }: ProtocolGridProps) => {
  if (protocols.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
        <p className="text-[#6B7280]">No protocols available at this time</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {protocols.map((protocol) => (
        <ProtocolCard
          key={protocol.id}
          protocol={protocol}
          onBorrow={onBorrow}
          disabled={disabled}
        />
      ))}
    </div>
  );
};
