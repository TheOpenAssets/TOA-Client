"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Wallet, Zap, LayoutDashboard,
    ShoppingBag, CircleDot, Layers, ChevronDown
} from "lucide-react";
import { cn } from "../../lib/utils";
import dagre from "dagre";

// ========================================
// THEME & CONFIG
// ========================================
const ICON_MAP: Record<string, any> = {
    entry: Wallet, hub: LayoutDashboard, action: Zap, finance: ShoppingBag, default: CircleDot,
};

const THEME = {
    entry: { border: "border-slate-400", accent: "#64748b", text: "text-slate-600", light: "bg-slate-100" },
    hub: { border: "border-blue-400", accent: "#3b82f6", text: "text-blue-600", light: "bg-blue-100" },
    action: { border: "border-emerald-400", accent: "#10b981", text: "text-emerald-600", light: "bg-emerald-100" },
    finance: { border: "border-amber-400", accent: "#f59e0b", text: "text-amber-600", light: "bg-amber-100" },
};

// ========================================
// REFINED PARSER & LAYOUT
// ========================================
function parseAndLayout(mermaid: string) {
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeMap = new Map();

    mermaid.split("\n").forEach(line => {
        const nodeMatch = line.trim().match(/(\w+)\[(.*?)(?:\|(.*?))?\]/);
        if (nodeMatch) {
            const node = { id: nodeMatch[1], title: nodeMatch[2].trim(), desc: nodeMatch[3]?.trim() || "", type: 'default' };
            nodes.push(node);
            nodeMap.set(node.id, node);
        }
        const edgeMatch = line.trim().match(/(\w+)\s*-->(?:\|(.*?)\|)?\s*(\w+)/);
        if (edgeMatch) edges.push({ from: edgeMatch[1], to: edgeMatch[3], label: edgeMatch[2] || "" });
        const classMatch = line.trim().match(/class\s+([\w,]+)\s+(\w+)/);
        if (classMatch) classMatch[1].split(",").forEach(id => {
            const n = nodeMap.get(id.trim());
            if (n) n.type = classMatch[2];
        });
    });

    const g = new dagre.graphlib.Graph();
    // Tighter spacing for better density
    g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 100 });
    g.setDefaultEdgeLabel(() => ({}));

    const nodeW = 250;
    const nodeH = 100;
    nodes.forEach(n => g.setNode(n.id, { width: nodeW, height: nodeH }));
    edges.forEach(e => g.setEdge(e.from, e.to));

    dagre.layout(g);

    const lNodes = nodes.map(n => ({ ...n, ...g.node(n.id), w: nodeW, h: nodeH }));
    const lEdges = edges.map(e => {
        const from = lNodes.find(n => n.id === e.from);
        const to = lNodes.find(n => n.id === e.to);
        if (!from || !to) return null;

        const x1 = from.x, y1 = from.y + nodeH / 2;
        const x2 = to.x, y2 = to.y - nodeH / 2;

        // "U-Shape" Symmetrical Pathing
        // Move 20px straight, then curve, then 20px straight
        const cp1 = y1 + 30;
        const cp2 = y2 - 30;
        const path = `M ${x1} ${y1} L ${x1} ${y1 + 10} C ${x1} ${cp1}, ${x2} ${cp2}, ${x2} ${y2 - 10} L ${x2} ${y2}`;

        return { ...e, path, color: THEME[from.type as keyof typeof THEME]?.accent || "#cbd5e1" };
    }).filter(Boolean);

    return {
        nodes: lNodes,
        edges: lEdges,
        width: g.graph().width || 800,
        height: g.graph().height || 800
    };
}

export default function Sitemap({ mermaidCode }: { mermaidCode: string }) {
    const [hovered, setHovered] = useState<string | null>(null);
    const [viewScale, setViewScale] = useState(1);
    const [isExpanded, setIsExpanded] = useState(false);
    const { nodes, edges, width, height } = useMemo(() => parseAndLayout(mermaidCode), [mermaidCode]);

    useEffect(() => {
        const handleResize = () => {
            const scale = Math.min((window.innerWidth - 100) / width, 1);
            setViewScale(scale);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [width]);

    // Calculate scaled dimensions for proper container sizing
    const scaledWidth = width * viewScale;
    const scaledHeight = height * viewScale;

    return (
        <div className="w-full bg-transparent flex flex-col items-center p-2 select-none">
            {/* Header Section */}
            <div 
                className="w-full mb-4 flex items-center justify-between pb-1 cursor-pointer hover:bg-slate-50/50 transition-colors rounded-xl px-4 py-2"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="size-10 bg-gray-200 rounded-2xl flex items-center justify-center shadow-xl ">
                        <Layers className="size-6 text-black" />
                    </div>
                    <div>
                        <h1 className="text-lg font-gellix font-medium text-slate-900 tracking-tight flex items-center gap-2">
                            System Sitemap
                            <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ChevronDown className="size-5 text-slate-400" />
                            </motion.div>
                        </h1>
                        <h3 className="text-sm text-slate-500"> An interactive visualization of the system architecture and user flows, click on the dropdown to expand or collapse the sitemap.</h3>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-6">
                    {Object.entries(THEME).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                            <div className="size-2 rounded-full" style={{ backgroundColor: v.accent }} /> {k}
                        </div>
                    ))}
                </div>
            </div>

            {/* Diagram Stage */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: scaledHeight + 100, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="overflow-hidden w-full flex flex-col items-center"
                    >
                        <div
                            className="relative transition-all duration-500 ease-out mt-8"
                            style={{ width: scaledWidth, height: scaledHeight }}
                        >
                            <div className="absolute inset-0" style={{ transform: `scale(${viewScale})`, transformOrigin: 'top left', width, height }}>
                                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                                    {edges.map((edge, i) => (
                                        <g key={i}>
                                            <path d={edge.path} fill="none" stroke="#e2e8f0" strokeWidth={5} />
                                            {/* The Sparkle/Dot Animation */}
                                            <motion.circle
                                                r="4"
                                                fill={edge.color}
                                                initial={{ offsetDistance: "0%" }}
                                                animate={{ offsetDistance: "100%" }}
                                                transition={{
                                                    duration: 3,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: i * 0.1
                                                }}
                                                style={{ offsetPath: `path('${edge.path}')`, filter: `drop-shadow(0 0 4px ${edge.color})` }}
                                            />
                                        </g>
                                    ))}
                                </svg>

                                {nodes.map((node) => {
                                    const theme = THEME[node.type as keyof typeof THEME] || THEME.entry;
                                    const Icon = ICON_MAP[node.type as keyof typeof ICON_MAP] || ICON_MAP.default;
                                    const isHovered = hovered === node.id;

                                    return (
                                        <div
                                            key={node.id}
                                            className="absolute"
                                            style={{
                                                left: node.x,
                                                top: node.y,
                                                width: node.w,
                                                height: node.h,
                                                transform: "translate(-50%, -50%)"
                                            }}
                                        >
                                            <motion.div
                                                onMouseEnter={() => setHovered(node.id)}
                                                onMouseLeave={() => setHovered(null)}
                                                className={cn(
                                                    "w-full bg-white rounded-2xl border-2 transition-all shadow-sm flex flex-col overflow-hidden",
                                                    theme.border,
                                                    isHovered ? "z-50 shadow-2xl -translate-y-1 scale-105" : "z-10"
                                                )}
                                                initial={false}
                                                animate={{ height: isHovered && node.desc ? 160 : 80 }}
                                            >
                                                <div className="flex items-center gap-4 p-4 h-[80px] shrink-0">
                                                    <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", theme.light)}>
                                                        <Icon className={cn("size-5", theme.text)} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <div className={cn("text-[9px] font-black uppercase tracking-widest leading-none mb-1 opacity-60", theme.text)}>
                                                            {node.type}
                                                        </div>
                                                        <h3 className="text-sm font-bold text-slate-800 truncate">{node.title}</h3>
                                                    </div>
                                                </div>
                                                <AnimatePresence>
                                                    {isHovered && node.desc && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="px-4 pb-4 overflow-hidden"
                                                        >
                                                            <div className="h-px bg-slate-100 mb-3" />
                                                            <p className="text-xs text-slate-500 leading-relaxed italic">
                                                                {node.desc}
                                                            </p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}