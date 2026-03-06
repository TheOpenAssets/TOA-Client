import { cn } from "../../lib/utils";
import {
  IconAdjustmentsBolt,
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconRouteAltLeft,
  IconTerminal2,
  IconCoin,
  IconShieldCheck,
} from "@tabler/icons-react";


const FeaturePage = () => {
  const features = [
    {
      title: "Canonical RWA Tokenization",
      description:
        "Real-world assets — invoices, trade finance instruments, property deeds — are verified, structured, and minted on Creditcoin EVM as compliant RWA tokens, permanently recorded on-chain.",
      icon: <IconTerminal2 />,
    },
    {
      title: "Credit-Aware Borrowing",
      description:
        "Deposit RWA tokens as collateral and borrow USDC with terms shaped by your composite credit score. Better credit history earns better LTV — up to 75% for Excellent-tier borrowers vs. the standard 70%.",
      icon: <IconEaseInOut />,
    },
    {
      title: "Composite Credit Score Engine",
      description:
        "Your score combines two layers: platform-level repayment history (Layer 1) and your verified on-chain lending record from the Creditcoin Substrate chain (Layer 2) — 4.27M real loan records.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "RWA & Private Asset–Backed Credit",
      description:
        "Issue on-chain credit using tokenized RWAs or privately documented assets held in a solvency vault, without fractionalizing ownership or exposing sensitive asset data.",
      icon: <IconCloud />,
    },
    {
      title: "USC: Trustless Cross-Chain Proof",
      description:
        "Creditcoin's Universal Smart Contract (USC) lets our contract verify repayments on Ethereum, BSC, and Bitcoin using STARK proofs via the 0x0FD2 precompile — no oracle, no bridge, no middleman.",
      icon: <IconShieldCheck />,
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
    {
      title: "OAID — Universal Credit Identity",
      description:
        "OAID is a wallet-bound credit identity that aggregates collateral, credit limits, and active loans into a single on-chain profile — carrying your Creditcoin credit score across every partner protocol.",
      icon: <IconRouteAltLeft />,
    },

  ];
  return (
    <>

      <div className="bg-transparent py-10 max-w-7xl mx-auto">
        <h1 className="font-antic text-black text-[64px] text-center mb-8  relative z-50">Features</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10">
          {features.map((feature, index) => (
            <Feature key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </>
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
  const colors = [
    { hover: "group-hover/feature:from-blue-50/50", accent: "group-hover/feature:bg-blue-500" },
    { hover: "group-hover/feature:from-purple-50/50", accent: "group-hover/feature:bg-purple-500" },
    { hover: "group-hover/feature:from-emerald-50/50", accent: "group-hover/feature:bg-emerald-500" },
    { hover: "group-hover/feature:from-amber-50/50", accent: "group-hover/feature:bg-amber-500" },
    { hover: "group-hover/feature:from-rose-50/50", accent: "group-hover/feature:bg-rose-500" },
    { hover: "group-hover/feature:from-indigo-50/50", accent: "group-hover/feature:bg-indigo-500" },
    { hover: "group-hover/feature:from-teal-50/50", accent: "group-hover/feature:bg-teal-500" },
    { hover: "group-hover/feature:from-cyan-50/50", accent: "group-hover/feature:bg-cyan-500" },
  ];
  const color = colors[index % colors.length];

  return (
    <div
      className={cn(
        "flex flex-col lg:border-r  py-10 relative group/feature border-neutral-200",
        (index === 0 || index === 4) && "lg:border-l border-neutral-200",
        index < 4 && "lg:border-b border-neutral-200"
      )}
    >
      {index < 4 && (
        <div className={cn(
          "opacity-0 group-hover/feature:opacity-100 transition duration-500 absolute inset-0 h-full w-full bg-linear-to-t to-transparent pointer-events-none",
          color.hover
        )} />
      )}
      {index >= 4 && (
        <div className={cn(
          "opacity-0 group-hover/feature:opacity-100 transition duration-500 absolute inset-0 h-full w-full bg-linear-to-b to-transparent pointer-events-none",
          color.hover
        )} />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className={cn(
          "absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 transition-all duration-500 origin-center",
          color.accent
        )} />
        <span className="group-hover/feature:translate-x-2 transition duration-500 inline-block text-neutral-800">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};

export default FeaturePage;
