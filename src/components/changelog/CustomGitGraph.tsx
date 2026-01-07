"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { GitMerge, GitBranch, Github } from 'lucide-react';

/* --- Design System Constants --- */
const COLUMN_WIDTH = 38;
const ROW_HEIGHT = 64;
const NODE_RADIUS = 8;
const LINE_THICKNESS = 4;
const BEND_RADIUS = 14;
const SVG_PADDING_LEFT = 40;

const BRANCH_COLORS: Record<string, string> = {
    'main': '#0969da', 'master': '#0969da',
    'dev': '#2da44e', 'development': '#2da44e',
    'staging': '#8250df',
};
const PALETTE = ['#cf222e', '#bf3989', '#d4a72c', '#1b7c83', '#4a235a', '#f66a0a', '#0366d6'];

const getBranchColor = (name: string, index: number) => {
    const key = name.toLowerCase();
    return BRANCH_COLORS[key] || PALETTE[index % PALETTE.length];
};

interface Commit {
    sha: string;
    commit: { message: string; author: { name: string; date: string; }; };
    parents: Array<{ sha: string }>;
    html_url?: string;
}

interface CustomGitGraphProps {
    commits: Commit[];
    branchHeads: any[];
    branches: { name: string; lastCommitSha: string }[];
    contributors: any[];
}

/**
 * Enhanced AuthorAvatar with clean caching
 */
const AuthorAvatar = ({ name, url, color }: { name: string, url?: string, color: string }) => {
    const [avatarData, setAvatarData] = useState<string | null>(null);
    const cacheKey = `git_avatar_${name.replace(/\s+/g, '_').toLowerCase()}`;

    useEffect(() => {
        if (!url) return;
        const cached = localStorage.getItem(cacheKey);
        if (cached) { setAvatarData(cached); return; }

        fetch(url).then(res => res.blob()).then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const b64 = reader.result as string;
                try { localStorage.setItem(cacheKey, b64); } catch (e) { }
                setAvatarData(b64);
            };
            reader.readAsDataURL(blob);
        }).catch(() => { });
    }, [url, cacheKey]);

    return (
        <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden border-2 border-white ring-1 ring-slate-200 relative bg-slate-100 shadow-sm transition-all group-hover:scale-110">
            {avatarData ? (
                <img src={avatarData} alt={name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: color }}>
                    {name.substring(0, 2).toUpperCase()}
                </div>
            )}
        </div>
    );
};

const CustomGitGraph: React.FC<CustomGitGraphProps> = ({ commits, branchHeads, branches, contributors }) => {

    const graphData = useMemo(() => {
        if (!commits?.length) return null;

        const avatarMap = new Map(contributors.map(c => [c.name, c.avatarUrl]));
        const shaToCommit = new Map(commits.map(c => [c.sha, c]));
        const shaToLane = new Map<string, number>();
        const headLabels = new Map<string, Array<{ name: string, color: string }>>();

        // 1. DETERMINISTIC LANE RESERVATION
        const sortedBranches = [...branches].sort((a, b) => {
            const prio: any = { 'main': 0, 'master': 0, 'dev': 1 };
            return (prio[a.name.toLowerCase()] ?? 99) - (prio[b.name.toLowerCase()] ?? 99);
        });

        const legend = sortedBranches.map((b, i) => {
            const color = getBranchColor(b.name, i);
            const labels = headLabels.get(b.lastCommitSha) || [];
            headLabels.set(b.lastCommitSha, [...labels, { name: b.name, color }]);

            let currentSha: string | undefined = b.lastCommitSha;
            while (currentSha && shaToCommit.has(currentSha)) {
                if (!shaToLane.has(currentSha)) shaToLane.set(currentSha, i);
                currentSha = shaToCommit.get(currentSha)?.parents[0]?.sha;
            }
            return { name: b.name, color };
        });

        const nodes = commits.map((c, i) => {
            const lane = shaToLane.get(c.sha) ?? sortedBranches.length;
            const color = getBranchColor(sortedBranches[lane]?.name || 'feature', lane);

            return {
                ...c, lane, color,
                x: lane * COLUMN_WIDTH + SVG_PADDING_LEFT,
                y: i * ROW_HEIGHT + ROW_HEIGHT / 2,
                heads: headLabels.get(c.sha) || [],
                avatarUrl: avatarMap.get(c.commit.author.name)
            };
        });

        return {
            nodes,
            nodeMap: new Map(nodes.map(n => [n.sha, n])),
            legend,
            totalWidth: (Math.max(...nodes.map(n => n.lane)) + 1) * COLUMN_WIDTH + 80,
            totalHeight: commits.length * ROW_HEIGHT
        };
    }, [commits, branches, contributors]);

    if (!graphData) return null;

    return (
        <div className="flex flex-col bg-white rounded-[32px] border border-slate-200 shadow-2xl h-[150vh] overflow-hidden antialiased font-sans">

            {/* 1. DETERMINISTIC BRANCH COLOR INDEX (TOOLBAR) */}
            <div className="px-8 py-5  border-b border-slate-200 flex items-center justify-between shadow-xl z-10 gap-2 mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                        <GitBranch size={20} />
                    </div>
                    <div>
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Architecture</span>
                        <span className="text-sm font-bold text-black uppercase tracking-wider">Branch Lanes</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    {graphData.legend.map((branch) => (
                        <div key={branch.name} className="flex items-center gap-2 px-3 py-1.5 border border-slate-700 rounded-full hover:border-slate-500 transition-colors cursor-default">
                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: branch.color }} />
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{branch.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden bg-slate-50/20">
                {/* 2. GRID CANVAS SIDE */}
                <div className="overflow-x-auto border-r border-slate-100 select-none no-scrollbar" style={{ width: graphData.totalWidth }}>
                    <div className="relative overflow-y-auto h-full no-scrollbar">
                        <svg width={graphData.totalWidth} height={graphData.totalHeight} className="drop-shadow-sm">
                            {graphData.nodes.map(node => (
                                <g key={`paths-${node.sha}`}>
                                    {node.parents.map((p, pIdx) => {
                                        const pNode = graphData.nodeMap.get(p.sha);
                                        if (!pNode) return null;

                                        const color = pIdx > 0 ? pNode.color : node.color;

                                        if (node.lane === pNode.lane) {
                                            // Perfectly straight vertical spine
                                            return <line key={p.sha} x1={node.x} y1={node.y} x2={pNode.x} y2={pNode.y} stroke={color} strokeWidth={LINE_THICKNESS} strokeOpacity={0.4} strokeLinecap="round" />;
                                        } else {
                                            /**
                                             * SYMMETRICAL ORTHOGONAL U-PATH LOGIC
                                             * MidX is the "gutter" between the two lanes
                                             */
                                            const midX = (node.x + pNode.x) / 2;
                                            const yDir = pNode.y > node.y ? 1 : -1;
                                            const xDir = pNode.x > node.x ? 1 : -1;

                                            // Handle cases where the vertical gap is too small for full bend radius
                                            const safeRadius = Math.min(BEND_RADIUS, Math.abs(pNode.y - node.y) / 2);

                                            const d = `
                                                M ${node.x} ${node.y}
                                                H ${midX - (xDir * safeRadius)}
                                                Q ${midX} ${node.y}, ${midX} ${node.y + (yDir * safeRadius)}
                                                V ${pNode.y - (yDir * safeRadius)}
                                                Q ${midX} ${pNode.y}, ${midX + (xDir * safeRadius)} ${pNode.y}
                                                H ${pNode.x}
                                            `;

                                            return (
                                                <path
                                                    key={p.sha} d={d} fill="none"
                                                    stroke={color} strokeWidth={LINE_THICKNESS} strokeOpacity={0.35}
                                                    strokeLinecap="round" strokeLinejoin="round"
                                                    strokeDasharray={pIdx > 0 ? "6 4" : "none"}
                                                />
                                            );
                                        }
                                    })}
                                </g>
                            ))}

                            {/* 3. BOLDER NODES WITH INTERACTIVE HALOS */}
                            {graphData.nodes.map(node => (
                                <g key={`node-${node.sha}`} className="group/node cursor-pointer">
                                    <circle cx={node.x} cy={node.y} r={NODE_RADIUS + 10} fill={node.color} className="opacity-0 group-hover/node:opacity-10 transition-all duration-300" />
                                    <circle cx={node.x} cy={node.y} r={NODE_RADIUS + 4} stroke={node.color} strokeWidth={1.5} fill="transparent" className="opacity-0 group-hover/node:opacity-40 transition-all duration-300" />
                                    <circle
                                        cx={node.x} cy={node.y} r={NODE_RADIUS}
                                        fill="white" stroke={node.color} strokeWidth={4}
                                        className="transition-all duration-200 group-hover/node:stroke-[6px] shadow-lg"
                                    />
                                    {node.parents.length > 1 && <circle cx={node.x} cy={node.y} r={2.5} fill={node.color} />}
                                </g>
                            ))}
                        </svg>
                    </div>
                </div>

                {/* 4. REFINED DETAILS LIST */}
                <div className="flex-1 overflow-y-auto bg-white divide-y divide-slate-100">
                    {graphData.nodes.map(node => (
                        <div key={node.sha} className="flex items-center px-8 hover:bg-slate-50 transition-all group" style={{ height: ROW_HEIGHT }}>
                            <AuthorAvatar name={node.commit.author.name} url={node.avatarUrl} color={node.color} />

                            <div className="ml-6 flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h4 className="text-[14px] font-black text-slate-800 truncate tracking-tight uppercase leading-none">
                                        {node.commit.message.split('\n')[0]}
                                    </h4>
                                    <div className="flex gap-1.5">
                                        {node.heads.map(h => (
                                            <span key={h.name} className="px-2 py-0.5 text-white text-[9px] font-black rounded-md uppercase shadow-sm border border-black/10" style={{ backgroundColor: h.color }}>
                                                {h.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold uppercase tracking-[0.1em]">
                                    <span className="text-slate-900 group-hover:text-blue-600 transition-colors font-black">{node.commit.author.name}</span>
                                    <span className="opacity-30">/</span>
                                    <a
                                        href={node.html_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100 font-mono tracking-normal lowercase transition-all"
                                    >
                                        <Github size={12} />
                                        {node.sha.substring(0, 7)}
                                    </a>
                                    <span className="opacity-30">/</span>
                                    <span className="tabular-nums font-medium opacity-60 lowercase">{format(new Date(node.commit.author.date), 'MMM dd, HH:mm')}</span>
                                </div>
                            </div>

                            {node.parents.length > 1 && (
                                <div className="ml-4 flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 shadow-sm transition-transform group-hover:scale-105">
                                    <GitMerge size={16} />
                                    <span className="text-[10px] font-black uppercase">Merge</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CustomGitGraph;