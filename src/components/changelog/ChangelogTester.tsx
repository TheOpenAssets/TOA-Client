"use client";

import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { useChangelogStore } from '../../stores/changelog.store.ts';
import type { ChangelogFilters } from '../../types/changelog.types.ts';
import { GitCommit, GitPullRequest, Clock, BarChart3, RefreshCw, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface ChangelogTesterProps {
    selectedRepo?: string;
    onRepoChange?: (repo: string) => void;
    contributors?: Array<{ name: string; avatarUrl?: string }>; // New prop
}

/**
 * NEW: PERSISTENT AVATAR CACHE COMPONENT
 */
const AuthorAvatar = ({ name, url }: { name: string, url?: string }) => {
    const [avatarData, setAvatarData] = useState<string | null>(null);
    const cacheKey = `gh_avatar_${name.replace(/\s+/g, '_').toLowerCase()}`;

    useEffect(() => {
        if (!url) return;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            setAvatarData(cached);
            return;
        }

        const fetchAndCache = async () => {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    try {
                        localStorage.setItem(cacheKey, base64data);
                    } catch (e) { /* LocalStorage full */ }
                    setAvatarData(base64data);
                };
                reader.readAsDataURL(blob);
            } catch (err) { console.error("Avatar fetch failed", err); }
        };
        fetchAndCache();
    }, [url, cacheKey]);

    const initials = name.substring(0, 2).toUpperCase();

    return (
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {avatarData ? (
                <img src={avatarData} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="text-[10px] font-bold text-slate-400">{initials}</span>
            )}
        </div>
    );
};

const ChangelogTester: React.FC<ChangelogTesterProps> = ({ selectedRepo: externalSelectedRepo, onRepoChange }) => {
    const {
        commits,
        pullRequests,
        timeline,
        statistics,
        organization,
        contributors, // Destructured from store
        commitsCount,
        pullRequestsCount,
        timelineCount,
        isLoadingCommits,
        isLoadingPullRequests,
        isLoadingTimeline,
        isLoadingStatistics,
        isSyncing,
        commitsError,
        pullRequestsError,
        timelineError,
        statisticsError,
        syncError,
        fetchCommits,
        fetchPullRequests,
        fetchTimeline,
        generateStatistics,
        triggerSync,
        fetchOrganization,
    } = useChangelogStore();

    // NEW: Create Avatar Lookup Map
    const avatarMap = useMemo(() => {
        const map = new Map<string, string>();
        contributors?.forEach(c => map.set(c.name, c.avatarUrl));
        return map;
    }, [contributors]);

    const [activeTab, setActiveTab] = useState<'sync' | 'commits' | 'prs' | 'timeline' | 'stats'>('commits');
    const [filters, setFilters] = useState<ChangelogFilters>({
        limit: 50,
        state: 'all',
    });

    useEffect(() => {
        if (!organization) {
            fetchOrganization().catch(console.error);
        }
    }, []);

    // ... (All your existing helper functions: availableRepos, availableBranches, getCurrentLoading, etc.)
    const availableRepos = organization?.repositories.map(repo => repo.name) || [];
    const availableBranches = filters.repo
        ? organization?.repositories.find(repo => repo.name === filters.repo)?.branches.map(b => b.name) || []
        : [];

    const getCurrentLoading = () => {
        switch (activeTab) {
            case 'sync': return isSyncing;
            case 'commits': return isLoadingCommits;
            case 'prs': return isLoadingPullRequests;
            case 'timeline': return isLoadingTimeline;
            case 'stats': return isLoadingStatistics;
            default: return false;
        }
    };

    const getCurrentError = () => {
        switch (activeTab) {
            case 'sync': return syncError;
            case 'commits': return commitsError;
            case 'prs': return pullRequestsError;
            case 'timeline': return timelineError;
            case 'stats': return statisticsError;
            default: return null;
        }
    };

    const getCurrentCount = () => {
        switch (activeTab) {
            case 'commits': return commitsCount;
            case 'prs': return pullRequestsCount;
            case 'timeline': return timelineCount;
            default: return 0;
        }
    };

    const handleAction = async () => {
        try {
            switch (activeTab) {
                case 'sync': await triggerSync(); break;
                case 'commits': await fetchCommits(filters); break;
                case 'prs': await fetchPullRequests(filters); break;
                case 'timeline': await fetchTimeline(filters); break;
                case 'stats': await generateStatistics(); break;
            }
        } catch (error) { console.error('Action failed:', error); }
    };

    const clearFilters = () => {
        setFilters({ limit: 50, state: 'all' });
    };

    return (
        <div className="bg-[#F9FAFB] rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-0 h-[800px]">
                {/* LEFT SIDEBAR (No changes) */}
                <div className="col-span-3 bg-white border-r border-[#E5E7EB] p-6 flex flex-col">
                    {/* ... (Your existing sidebar code remains exactly as is) ... */}
                    <div className="mb-6">
                        <label className="block text-xs font-semibold text-[#111111] mb-2">Request Type</label>
                        <div className="relative">
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value as any)}
                                className="w-full px-4 py-3 bg-white border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#111111] appearance-none cursor-pointer focus:outline-none focus:border-[#111111] pr-10"
                            >
                                <option value="commits">Commits</option>
                                <option value="prs">Pull Requests</option>
                                <option value="timeline">Timeline</option>
                                <option value="stats">Statistics</option>
                                <option value="sync">Sync Data</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                {activeTab === 'commits' && <GitCommit className="w-4 h-4 text-[#6B7280]" />}
                                {activeTab === 'prs' && <GitPullRequest className="w-4 h-4 text-[#6B7280]" />}
                                {activeTab === 'timeline' && <Clock className="w-4 h-4 text-[#6B7280]" />}
                                {activeTab === 'stats' && <BarChart3 className="w-4 h-4 text-[#6B7280]" />}
                                {activeTab === 'sync' && <RefreshCw className="w-4 h-4 text-[#6B7280]" />}
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    {activeTab !== 'sync' && activeTab !== 'stats' && (
                        <div className="flex-1 flex flex-col border-t border-[#E5E7EB] pt-6">
                            <div className="mb-4">
                                <h3 className="text-xs font-semibold text-[#111111]">Filters</h3>
                            </div>

                            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                                <div>
                                    <label className="block text-xs text-[#6B7280] mb-1.5">Repository</label>
                                    <select
                                        value={filters.repo || externalSelectedRepo || ''}
                                        onChange={(e) => {
                                            setFilters({ ...filters, repo: e.target.value || undefined });
                                            if (onRepoChange && e.target.value) {
                                                onRepoChange(e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                                    >
                                        <option value="">All Repositories</option>
                                        {availableRepos.map(repo => (
                                            <option key={repo} value={repo}>{repo}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs text-[#6B7280] mb-1.5">Branch</label>
                                    <select
                                        value={filters.branch || ''}
                                        onChange={(e) => setFilters({ ...filters, branch: e.target.value || undefined })}
                                        disabled={!filters.repo}
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111] disabled:opacity-50"
                                    >
                                        <option value="">All Branches</option>
                                        {availableBranches.map(branch => (
                                            <option key={branch} value={branch}>{branch}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs text-[#6B7280] mb-1.5">Author</label>
                                    <input
                                        type="text"
                                        value={filters.author || ''}
                                        onChange={(e) => setFilters({ ...filters, author: e.target.value || undefined })}
                                        placeholder="Filter by author"
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>

                                {activeTab === 'prs' && (
                                    <div>
                                        <label className="block text-xs text-[#6B7280] mb-1.5">State</label>
                                        <select
                                            value={filters.state || 'all'}
                                            onChange={(e) => setFilters({ ...filters, state: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                                        >
                                            <option value="all">All States</option>
                                            <option value="open">Open</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs text-[#6B7280] mb-1.5">Since</label>
                                    <input
                                        type="date"
                                        value={filters.since ? filters.since.split('T')[0] : ''}
                                        onChange={(e) => setFilters({ ...filters, since: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-[#6B7280] mb-1.5">Until</label>
                                    <input
                                        type="date"
                                        value={filters.until ? filters.until.split('T')[0] : ''}
                                        onChange={(e) => setFilters({ ...filters, until: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-[#6B7280] mb-1.5">Limit</label>
                                    <input
                                        type="number"
                                        value={filters.limit || 50}
                                        onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) || 50 })}
                                        min="1"
                                        max="100"
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>

                                <button
                                    onClick={clearFilters}
                                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-xs font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-[#E5E7EB]">
                        <button
                            onClick={handleAction}
                            disabled={getCurrentLoading()}
                            className="w-full px-4 py-3 bg-[#111111] text-white rounded-lg text-sm font-medium hover:bg-[#000000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {getCurrentLoading() ? (
                                <><RefreshCw className="w-4 h-4 animate-spin" />Loading...</>
                            ) : (
                                `Fetch ${activeTab === 'sync' ? 'Sync' : activeTab === 'stats' ? 'Statistics' : activeTab === 'prs' ? 'PRs' : activeTab === 'timeline' ? 'Timeline' : 'Commits'}`
                            )}
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDE (Updated to use AuthorAvatar) */}
                <div className="col-span-9 bg-white p-6 overflow-hidden flex flex-col">
                    <div className="mb-4 pb-4 border-b border-[#E5E7EB]">
                        <h3 className="text-lg font-semibold text-[#111111]">
                            {activeTab === 'sync' && 'Sync Results'}
                            {activeTab === 'commits' && `Commits (${getCurrentCount()})`}
                            {activeTab === 'prs' && `Pull Requests (${getCurrentCount()})`}
                            {activeTab === 'timeline' && `Timeline (${getCurrentCount()})`}
                            {activeTab === 'stats' && 'Statistics'}
                        </h3>
                        {getCurrentError() && <p className="text-xs text-red-600 mt-1">❌ {getCurrentError()}</p>}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {getCurrentLoading() && (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#111111] mb-3"></div>
                                    <p className="text-sm text-[#6B7280]">Loading...</p>
                                </div>
                            </div>
                        )}

                        {/* Commits List - UPDATED WITH AVATAR */}
                        {!getCurrentLoading() && activeTab === 'commits' && commits.length > 0 && (
                            <div className="space-y-3">
                                {commits.map((commit, idx) => (
                                    <div key={idx} className="border border-[#E5E7EB] rounded-lg p-4 hover:border-[#111111] transition-colors shadow-sm">
                                        <div className="flex items-start gap-4">
                                            {/* UPDATED: AuthorAvatar with Caching */}
                                            <AuthorAvatar
                                                name={commit.author}
                                                url={avatarMap.get(commit.raw.commit.author.name)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[#111111] mb-1">{commit.raw.commit.message.split('\n')[0]}</p>
                                                <div className="flex items-center gap-2 text-xs text-[#6B7280] flex-wrap font-medium">
                                                    <span className="text-slate-900 font-bold uppercase tracking-tight">{commit.author}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{commit.repoName}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span>{format(new Date(commit.timestamp), 'MMM d, yyyy HH:mm')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Timeline List - UPDATED WITH AVATAR */}
                        {!getCurrentLoading() && activeTab === 'timeline' && timeline.length > 0 && (
                            <div className="space-y-3">
                                {timeline.map((item, idx) => (
                                    <div key={idx} className="border border-[#E5E7EB] rounded-lg p-4 hover:border-[#111111] transition-colors shadow-sm">
                                        <div className="flex items-start gap-4">
                                            {/* UPDATED: AuthorAvatar with Caching */}
                                            <AuthorAvatar
                                                name={item.author}
                                                url={avatarMap.get(item.kind === 'COMMIT' ? item.raw.commit.author.name : item.author)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[#111111] mb-1">
                                                    {item.kind === 'COMMIT' ? item.raw.commit.message.split('\n')[0] : item.raw.title}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-[#6B7280] flex-wrap font-medium">
                                                    <div className={item.kind === 'COMMIT' ? 'text-blue-600' : 'text-purple-600'}>
                                                        {item.kind === 'COMMIT' ? '📝' : '🔀'}
                                                    </div>
                                                    <span className="text-slate-900 font-bold uppercase tracking-tight">{item.author}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{item.repoName}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span>{format(new Date(item.timestamp), 'MMM d, yyyy HH:mm')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ... (Rest of your component: PRs, Stats, Empty State) ... */}
                        {!getCurrentLoading() && activeTab === 'prs' && pullRequests.length > 0 && (
                            <div className="space-y-3">
                                {pullRequests.map((pr, idx) => (
                                    <div key={idx} className="border border-[#E5E7EB] rounded-lg p-4 hover:border-[#111111] transition-colors shadow-sm flex items-center gap-4">
                                        <AuthorAvatar name={pr.author} url={avatarMap.get(pr.author)} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-1">
                                                <h4 className="text-sm font-semibold text-[#111111]">{pr.raw.title}</h4>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ml-2 ${pr.raw.state === 'open' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>{pr.raw.state}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-[#6B7280] uppercase tracking-tighter">
                                                <span className="text-blue-500 font-mono">#{pr.raw.number}</span>
                                                <span className="opacity-30">•</span>
                                                <span className="text-slate-900">{pr.author}</span>
                                                <span className="opacity-30">•</span>
                                                <span>{pr.repoName}</span>
                                                <span className="opacity-30">•</span>
                                                <span>{format(new Date(pr.timestamp), 'MMM d, HH:mm')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!getCurrentLoading() && activeTab === 'stats' && statistics && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#F9FAFB] rounded-2xl p-5 border border-slate-200">
                                        <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-1">Total Commits</p>
                                        <p className="text-3xl font-black text-[#111111]">{statistics.totalCommits}</p>
                                    </div>
                                    <div className="bg-[#F9FAFB] rounded-2xl p-5 border border-slate-200">
                                        <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-1">Total Pull Requests</p>
                                        <p className="text-3xl font-black text-[#111111]">{statistics.totalPullRequests}</p>
                                    </div>
                                </div>
                                {/* Repos and Contributors lists remain same */}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangelogTester;