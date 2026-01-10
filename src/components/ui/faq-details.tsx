import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Layout, Pointer, Zap } from "lucide-react";
import VideoPlayer from "./video-player";
import { useRef, useEffect, useState } from "react";

interface TabContent {
    badge: string;
    title: string;
    description: string;
    buttonText: string;
    videoSrc: string;
}

interface Tab {
    value: string;
    icon: React.ReactNode;
    label: string;
    content: TabContent;
}

interface Feature108Props {
    badge?: string;
    heading?: string;
    description?: string;
    tabs?: Tab[];
}

const FaqDetails = ({
    badge = "How It Works",
    heading = "Understand the Platform in Minutes",
    description =
    "Short guided walkthroughs showing how to use each core feature of the platform.",
    tabs = [
        {
            value: "auth",
            icon: <Pointer className="h-auto w-4 shrink-0" />,
            label: "Authenticate",
            content: {
                badge: "Access",
                title: "Connect your wallet and get started",
                description:
                    "Authenticate using your wallet. Each wallet is bound to a single role and returning users are connected automatically.",
                buttonText: "Connect Wallet",
                videoSrc: "https://www.youtube.com/watch?v=NzwJmR2Cf-c",
            },
        },
        {
            value: "issuer",
            icon: <Layout className="h-auto w-4 shrink-0" />,
            label: "Register Asset",
            content: {
                badge: "Issuers",
                title: "Submit real-world assets for tokenization",
                description:
                    "Issuers onboard once and can submit assets for verification, tokenization, and lifecycle tracking.",
                buttonText: "Become an Issuer",
                videoSrc: "https://www.youtube.com/watch?v=NvWckbwETag"
            },
        },
        {
            value: "explore",
            icon: <Layout className="h-auto w-4 shrink-0" />,
            label: "Explore",
            content: {
                badge: "Marketplace",
                title: "Discover live RWA listings",
                description:
                    "Browse fixed-price and auction-based assets with transparent yield, maturity, and risk indicators.",
                buttonText: "Explore Marketplace",
                videoSrc: "https://www.youtube.com/watch?v=ZIQv8VWyGm0"
            },
        },
        {
            value: "buy",
            icon: <Zap className="h-auto w-4 shrink-0" />,
            label: "Buy",
            content: {
                badge: "Primary Market",
                title: "Buy tokenized RWAs using USDC",
                description:
                    "Purchase RWA tokens directly through a simple buy module showing pricing, quantity, and settlement details.",
                buttonText: "Buy Asset",
                videoSrc: "https://www.youtube.com/watch?v=83KqrM6dhFs"
            },
        },
        {
            value: "auction",
            icon: <Zap className="h-auto w-4 shrink-0" />,
            label: "Bid",
            content: {
                badge: "Auctions",
                title: "Participate in asset auctions",
                description:
                    "Place bids on auction listings. Winning bids receive tokens at clearing price, others are refunded automatically.",
                buttonText: "Place Bid",
                videoSrc: "https://www.youtube.com/watch?v=IB1VmpVxiXQ",
            },
        },
        {
            value: "leverage",
            icon: <Zap className="h-auto w-4 shrink-0" />,
            label: "Leverage",
            content: {
                badge: "mETH Buy",
                title: "Buy RWAs using leveraged mETH",
                description:
                    "Use mETH as collateral to create leveraged exposure while yield services interest automatically.",
                buttonText: "Use mETH",
                videoSrc: "https://youtu.be/c7CdBkcVZPQ",
            },
        },
        {
            value: "portfolio",
            icon: <Layout className="h-auto w-4 shrink-0" />,
            label: "Portfolio",
            content: {
                badge: "Overview",
                title: "Track all positions in one place",
                description:
                    "View owned tokens, auction bids, leveraged positions, loans, yield history, and health metrics.",
                buttonText: "View Portfolio",
                videoSrc: "https://youtu.be/NtLOZqsX5U8",
            },
        },
        {
            value: "trade",
            icon: <Layout className="h-auto w-4 shrink-0" />,
            label: "Trade",
            content: {
                badge: "Secondary Market",
                title: "Trade RWAs without losing yield",
                description:
                    "Buy and sell RWAs on the secondary marketplace while preserving time-weighted yield.",
                buttonText: "Trade Tokens",
                videoSrc: "",
            },
        },
        {
            value: "borrow",
            icon: <Zap className="h-auto w-4 shrink-0" />,
            label: "Borrow",
            content: {
                badge: "Credit",
                title: "Access credit using OAID",
                description:
                    "Borrow against RWAs or private assets across native and partner protocols without moving collateral.",
                buttonText: "Borrow",
                videoSrc: "",
            },
        },
    ],
}: Feature108Props) => {
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState(tabs[0].value);

    useEffect(() => {
        // Scroll to video when tab changes
        if (videoContainerRef.current) {
            videoContainerRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }, [activeTab]);

    return (
        <section className="py-10 bg-white/90 max-w-screen rounded-4xl">
            <div className="container mx-auto p-2 ">
                <div className="flex flex-col items-center gap-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#F3F4F6] text-[#111111] text-sm font-medium border border-[#E5E7EB]">
                        {badge}
                    </span>
                    <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-[#111111]">
                        {heading}
                    </h1>
                    <p className="text-[#6B7280] text-lg max-w-2xl">{description}</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
                    <TabsList className="container flex flex-wrap items-center justify-center gap-2 mb-8">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111111] data-[state=active]:bg-[#F3F4F6] data-[state=active]:text-[#111111] data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-[#E5E7EB]"
                            >
                                {tab.icon}
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="mx-auto mt-8 max-w-screen rounded-[20px] bg-transparent p-8 lg:p-12 shadow-[0_2px_12px_rgba(0,0,0,0.09)]">
                        {tabs.map((tab) => (
                            <TabsContent
                                key={tab.value}
                                value={tab.value}
                                className="focus-visible:outline-none"
                            >
                                <div className="flex flex-col gap-6 max-w-screen">
                                    <span className="inline-flex w-fit items-center px-3 py-1 rounded-full bg-[#F3F4F6] text-[#111111] text-sm font-medium border border-[#E5E7EB]">
                                        {tab.content.badge}
                                    </span>
                                    <h3 className="text-3xl font-semibold lg:text-4xl text-[#111111] tracking-tight">
                                        {tab.content.title}
                                    </h3>
                                    <p className="text-[#6B7280] text-base lg:text-lg leading-relaxed">
                                        {tab.content.description}
                                    </p>

                                    <div ref={videoContainerRef} className="mt-4">
                                        <VideoPlayer src={tab.content.videoSrc} />
                                    </div>
                                </div>
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </div>
        </section>
    );
};

export default FaqDetails;
