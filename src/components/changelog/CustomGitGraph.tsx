"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ExternalLink, GitMerge, GitBranch } from 'lucide-react';

interface Contributor {
    name: string;
    author: string;
    avatarUrl: string;
}

interface Commit {
    sha: string;
    commit: {
        message: string;
        author: { name: string; email?: string; date: string; };
    };
    parents: Array<{ sha: string }>;
    html_url?: string;
}

interface BranchHead {
    name: string;
    commit: { sha: string };
}

interface CustomGitGraphProps {
    commits: Commit[];
    branchHeads?: BranchHead[];
    contributors?: Contributor[];
}

const LANE_WIDTH = 34;
const ROW_HEIGHT = 60;
const NODE_RADIUS = 4.5;
const SVG_PADDING_LEFT = 30;

const BRANCH_COLORS = [
    '#2188ff', // GitHub Blue (Main)
    '#28a745', // GitHub Green
    '#6f42c1', // GitHub Purple
    '#f66a0a', // GitHub Orange
    '#d73a49', // GitHub Red
    '#ea4aaa', // GitHub Pink
    '#0366d6', // GitHub Dark Blue
];

/**
 * AUTHOR AVATAR WITH PERSISTENT BROWSER CACHE
 * Fetches once, converts to Base64, and saves to LocalStorage.
 */
const AuthorAvatar = ({ name, url, color }: { name: string, url?: string, color: string }) => {
    const [avatarData, setAvatarData] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const cacheKey = `git_avatar_${name.replace(/\s+/g, '_').toLowerCase()}`;

    useEffect(() => {
        if (!url) return;

        // 1. Try to load from LocalStorage
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            setAvatarData(cached);
            return;
        }

        // 2. Fetch and Cache if not present
        const fetchAndCache = async () => {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    try {
                        localStorage.setItem(cacheKey, base64data);
                    } catch (e) {
                        console.warn("Storage full, skipping cache for:", name);
                    }
                    setAvatarData(base64data);
                };
                reader.readAsDataURL(blob);
            } catch (err) {
                setError(true);
            }
        };

        fetchAndCache();
    }, [url, cacheKey, name]);

    const initials = name.substring(0, 2).toUpperCase();

    return (
        <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black text-white shadow-sm flex-shrink-0 transition-transform group-hover:scale-110 overflow-hidden border-2 border-white ring-1 ring-slate-100 relative bg-slate-100"
            style={{ backgroundColor: !avatarData || error ? color : undefined }}
        >
            {avatarData && !error ? (
                <img src={avatarData} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="relative z-10">{initials}</span>
            )}
        </div>
    );
};

const CustomGitGraph: React.FC<CustomGitGraphProps> = ({ commits, branchHeads = [], contributors = [] }) => {
    const processedData = useMemo(() => {
        if (!commits || commits.length === 0) return null;

        const avatarMap = new Map<string, string>();
        contributors.forEach(c => avatarMap.set(c.name, c.avatarUrl));

        const shaToCommit = new Map(commits.map(c => [c.sha, c]));
        const shaToLane = new Map<string, number>();
        const shaToBranchNames = new Map<string, string[]>();
        const branchNameToLane = new Map<string, number>();

        let nextLane = 0;
        const sortedHeads = [...branchHeads].sort((a, b) => a.name === 'main' ? -1 : b.name === 'main' ? 1 : 0);

        sortedHeads.forEach(head => {
            if (!branchNameToLane.has(head.name)) branchNameToLane.set(head.name, nextLane++);
            const current = shaToBranchNames.get(head.commit.sha) || [];
            shaToBranchNames.set(head.commit.sha, [...current, head.name]);
        });

        sortedHeads.forEach(head => {
            const assignedLane = branchNameToLane.get(head.name)!;
            let currentSha: string | undefined = head.commit.sha;
            while (currentSha && shaToCommit.has(currentSha)) {
                if (shaToLane.has(currentSha)) break;
                shaToLane.set(currentSha, assignedLane);
                currentSha = shaToCommit.get(currentSha)?.parents?.[0]?.sha;
            }
        });

        const nodes = commits.map((commit, index) => {
            const sha = commit.sha;
            if (!shaToLane.has(sha)) shaToLane.set(sha, nextLane++);
            const lane = shaToLane.get(sha)!;

            return {
                ...commit,
                lane,
                avatarUrl: avatarMap.get(commit.commit.author.name),
                x: lane * LANE_WIDTH + SVG_PADDING_LEFT,
                y: index * ROW_HEIGHT + ROW_HEIGHT / 2,
                headNames: shaToBranchNames.get(sha) || []
            };
        });

        return {
            nodes,
            processedMap: new Map(nodes.map(n => [n.sha, n])),
            maxLane: nextLane - 1,
            svgHeight: commits.length * ROW_HEIGHT,
            legend: Array.from(branchNameToLane.entries()).map(([name, lane]) => ({
                name,
                color: BRANCH_COLORS[lane % BRANCH_COLORS.length]
            }))
        };
    }, [commits, branchHeads, contributors]);

    if (!processedData) return null;

    const svgWidth = (processedData.maxLane + 1) * LANE_WIDTH + 40;

    return (
        <div className="flex flex-col bg-white rounded-3xl border border-slate-200 shadow-2xl h-[850px] overflow-hidden antialiased font-sans">

            {/* CLEAN REFINED HEADER */}
            <div className="px-8 py-5 border-b border-slate-100 bg-white/95 backdrop-blur-xl sticky top-0 z-20">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-slate-900 rounded-2xl shadow-xl shadow-slate-200">
                            <GitBranch size={22} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1.5">Branch Insights</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lineage Mapping</span>
                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] text-blue-500 font-black uppercase tracking-wider italic">Optimized Cache</span>
                            </div>
                        </div>
                    </div>
                    <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                        <span className="text-xs font-black text-blue-600 tabular-nums uppercase">{commits.length} Sync Points</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    {processedData.legend.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-slate-300 transition-all cursor-default group">
                            <div className="w-2.5 h-2.5 rounded-full ring-4 ring-slate-50 transition-transform group-hover:scale-110" style={{ backgroundColor: item.color }} />
                            <span className="text-[11px] font-black text-slate-700 tracking-tight">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* SHARED SCROLL CONTAINER */}
            <div className="flex flex-1 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-slate-50/10">

                {/* SVG CANVAS */}
                <div className="relative border-r border-slate-50 bg-slate-50/20 flex-shrink-0" style={{ width: `${svgWidth}px` }}>
                    <svg width={svgWidth} height={processedData.svgHeight} className="block">
                        {processedData.nodes.map((node) =>
                            node.parents.map((parent, pIndex) => {
                                const parentNode = processedData.processedMap.get(parent.sha);
                                if (!parentNode) return null;
                                const color = BRANCH_COLORS[node.lane % BRANCH_COLORS.length];
                                const parentColor = BRANCH_COLORS[parentNode.lane % BRANCH_COLORS.length];

                                if (node.lane === parentNode.lane) {
                                    return <line key={`${node.sha}-${parent.sha}`} x1={node.x} y1={node.y} x2={parentNode.x} y2={parentNode.y} stroke={color} strokeWidth="2.5" strokeOpacity="0.2" strokeLinecap="round" />;
                                } else {
                                    const curveY = (node.y + parentNode.y) / 2;
                                    const pathD = `M ${node.x} ${node.y} C ${node.x} ${curveY}, ${parentNode.x} ${curveY}, ${parentNode.x} ${parentNode.y}`;
                                    return <path key={`${node.sha}-${parent.sha}`} d={pathD} fill="none" stroke={pIndex > 0 ? parentColor : color} strokeWidth="2.5" strokeOpacity="0.2" strokeDasharray={pIndex > 0 ? "5 4" : "none"} />;
                                }
                            })
                        )}

                        {processedData.nodes.map((node) => {
                            const color = BRANCH_COLORS[node.lane % BRANCH_COLORS.length];
                            const isMerge = node.parents.length > 1;
                            return (
                                <g key={node.sha} className="group">
                                    {isMerge && <circle cx={node.x} cy={node.y} r={NODE_RADIUS + 4.5} fill="none" stroke={color} strokeWidth="1" className="opacity-30 group-hover:opacity-100 transition-opacity" />}
                                    <circle cx={node.x} cy={node.y} r={NODE_RADIUS} fill="white" stroke={color} strokeWidth="2.5" className="transition-all duration-200 group-hover:stroke-[4px]" />
                                    <circle cx={node.x} cy={node.y} r={1.5} fill={color} />
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* DETAILS LIST */}
                <div className="flex-1 bg-white">
                    {processedData.nodes.map((node) => (
                        <div key={node.sha} className="flex items-center px-8 border-b border-slate-50 hover:bg-slate-50/60 transition-all group" style={{ height: `${ROW_HEIGHT}px` }}>

                            <AuthorAvatar
                                name={node.commit.author.name}
                                url={node.avatarUrl}
                                color={BRANCH_COLORS[node.lane % BRANCH_COLORS.length]}
                            />

                            <div className="flex-1 min-w-0 px-5">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <h4 className="text-[13px] font-black text-slate-800 truncate max-w-[450px] tracking-tight">{node.commit.message.split('\n')[0]}</h4>
                                    {node.parents.length > 1 && <GitMerge size={12} className="text-purple-600" />}
                                    {node.headNames.map(name => (
                                        <div key={name} className="px-2 py-0.5 rounded-md bg-slate-900 flex items-center shadow-sm">
                                            <span className="text-[9px] font-black text-white uppercase tracking-tighter">{name}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold uppercase tracking-tighter">
                                    <span className="text-slate-900 group-hover:text-blue-600 transition-colors">{node.commit.author.name}</span>
                                    <span className="opacity-20">•</span>
                                    <span className="font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{node.sha.substring(0, 7)}</span>
                                    <span className="opacity-20">•</span>
                                    <span className="tabular-nums font-black italic">{format(new Date(node.commit.author.date), 'MMM dd, HH:mm')}</span>
                                </div>
                            </div>

                            <a href={node.html_url} target="_blank" className="opacity-0 group-hover:opacity-100 transition-all p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm">
                                <ExternalLink size={16} />
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CustomGitGraph;