import { cn } from "../../lib/utils";
import {
  IconAdjustmentsBolt,
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconRouteAltLeft,
  IconTerminal2,
  IconCoin,
} from "@tabler/icons-react";


const AutoRepayingSection = () => {
  const features = [
    {
      title: "Canonical RWA Tokenization",
      description:
        "Real-world assets are verified, structured, and minted on-chain as compliant RWA tokens. The protocol currently focuses on invoices, with extensibility to additional asset classes over time.",
      icon: <IconTerminal2 />,
    },
    {
      title: "Leveraged RWA Buying (M-ETH)",
      description:
        "Users acquire RWA tokens using M-ETH deposited into a leveraged vault. USDC is sourced from the protocol’s lending pool, while M-ETH yield is programmatically applied toward loan repayment.",
      icon: <IconEaseInOut />,
    },
    {
      title: "Automated Leverage Repayment Engine",
      description:
        "Interest earned on M-ETH is routed through Fluxion or protocol-native swaps to service senior pool obligations, reducing user debt without manual intervention.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "RWA & Private Asset–Backed Credit",
      description:
        "Issue on-chain credit using tokenized RWAs or privately documented assets held in a solvency vault, without fractionalizing ownership or exposing sensitive asset data.",
      icon: <IconCloud />,
    },
    {
      title: "Cross-Protocol Borrowing Access",
      description:
        "Collateralized positions can source liquidity from multiple partner protocols and the native lending pool, enabling flexible credit routing without breaking solvency guarantees.",
      icon: <IconRouteAltLeft />,
    },
    {
      title: "Deterministic Yield Distribution",
      description:
        "Real-world cash flows are settled on-chain and distributed pro-rata to RWA token holders using deterministic, index-based accounting.",
      icon: <IconAdjustmentsBolt />,
    },
    {
      title: "Secondary & OTC RWA Marketplace",
      description:
        "Trade RWA tokens via a native peer-to-peer and OTC marketplace, with on-chain buy and sell orders that counterparties can directly satisfy.",
      icon: <IconCoin />,
    },
  ];
  return (
    
    <div className="bg-transparent py-10 max-w-7xl mx-auto">
      <h1 className="font-antic text-black text-4xl text-center mb-8">Features</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
      </div>
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r  py-10 relative group/feature border-neutral-200",
        (index === 0 || index === 4) && "lg:border-l border-neutral-200",
        index < 4 && "lg:border-b border-neutral-200"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};

export default AutoRepayingSection;
