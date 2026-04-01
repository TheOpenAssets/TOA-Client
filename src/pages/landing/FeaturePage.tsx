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
      title: "BNB Primary Firm Vaults",
      description:
        "Investors deposit directly into issuer-backed vault listings on BNB Testnet with transparent on-chain settlement and position tracking.",
      icon: <IconTerminal2 />,
    },
    {
      title: "Deposit-First Investor UX",
      description:
        "The investor journey is focused on vault participation, allocation, and payout visibility without retail borrow complexity.",
      icon: <IconEaseInOut />,
    },
    {
      title: "ankrBNB Collateral Leverage",
      description:
        "Advanced participants can use ankrBNB collateral to open leveraged vault exposure through the latest BNB leverage vault contracts.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "On-Chain Compliance Rails",
      description:
        "Identity Registry, Trusted Issuer checks, and attestation-aware listing flow enforce policy at contract level before capital deployment.",
      icon: <IconCloud />,
    },
    {
      title: "Deterministic Yield Distribution",
      description:
        "YieldVault accounting distributes settlement proceeds and claimable investor yield with auditable on-chain math.",
      icon: <IconShieldCheck />,
    },
    {
      title: "Primary + Secondary Liquidity",
      description:
        "Participate in primary vault deposits, then use the secondary market for position rebalancing and transfer liquidity.",
      icon: <IconAdjustmentsBolt />,
    },
    {
      title: "Integrated Faucet Flow",
      description:
        "One-click test token minting for USDC and ankrBNB keeps onboarding fast for vault deposits and leverage testing on BNB.",
      icon: <IconCoin />,
    },
    {
      title: "Issuer-to-Investor Execution Loop",
      description:
        "From issuer listing approval to investor allocation and settlement claims, the full lifecycle is handled in one BNB-native platform.",
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
