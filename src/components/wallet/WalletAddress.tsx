// src/components/wallet/WalletAddress.tsx

interface WalletAddressProps {
  address: string;
}

/**
 * WalletAddress Component
 * Displays shortened wallet address
 */
export const WalletAddress = ({ address }: WalletAddressProps) => {
  const shortenAddress = (addr: string): string => {
    if (!addr) return '';
    const start = addr.slice(0, 6);
    const end = addr.slice(-4);
    return `${start}...${end}`;
  };

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      <span className="text-sm font-medium text-foreground">
        {shortenAddress(address)}
      </span>
    </div>
  );
};
