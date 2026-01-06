import React, { useState, useEffect } from 'react';
import { useChangelogStore } from '../../stores/changelog.store.ts';
import type { ChangelogFilters } from '../../types/changelog.types.ts';

const ChangelogTester: React.FC = () => {
    const {
        // Data
        commits,
        pullRequests,
        timeline,
        statistics,
        syncResult,
        organization,
        uiMetrics,
        contributors,
        // Counts
        commitsCount,
        pullRequestsCount,
        timelineCount,
        // Loading states
        isLoadingCommits,
        isLoadingPullRequests,
        isLoadingTimeline,
        isLoadingStatistics,
        isSyncing,
        isLoadingMetrics,
        isSyncingMetrics,
        // Error states
        commitsError,
        pullRequestsError,
        timelineError,
        statisticsError,
        syncError,
        metricsError,
        // Actions
        fetchCommits,
        fetchPullRequests,
        fetchTimeline,
        generateStatistics,
        triggerSync,
        fetchOrganization,
        fetchUiMetrics,
        triggerMetricsSync,
    } = useChangelogStore();

    const [activeTab, setActiveTab] = useState<'sync' | 'commits' | 'prs' | 'timeline' | 'stats'>('commits');
    const [selectedRepo, setSelectedRepo] = useState<string>('');
    const [filters, setFilters] = useState<ChangelogFilters>({
        limit: 10,
        state: 'all',
    });

    // Fetch organization data on mount
    useEffect(() => {
        fetchOrganization().catch(console.error);
    }, []);

    // Get available repos and branches
    const availableRepos = organization?.repositories.map(repo => repo.name) || [];
    const availableBranches = filters.repo
        ? organization?.repositories.find(repo => repo.name === filters.repo)?.branches.map(b => b.name) || []
        : [];

    // Get current loading state
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

    // Get current error
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

    // Get current count
    const getCurrentCount = () => {
        switch (activeTab) {
            case 'commits': return commitsCount;
            case 'prs': return pullRequestsCount;
            case 'timeline': return timelineCount;
            default: return 0;
        }
    };

    // Handler functions
    const handleTriggerSync = async () => {
        try {
            await triggerSync();
        } catch (error) {
            console.error('Sync failed:', error);
        }
    };

    const handleGetCommits = async () => {
        try {
            await fetchCommits(filters);
        } catch (error) {
            console.error('Failed to fetch commits:', error);
        }
    };

    const handleGetPullRequests = async () => {
        try {
            await fetchPullRequests(filters);
        } catch (error) {
            console.error('Failed to fetch pull requests:', error);
        }
    };

    const handleGetTimeline = async () => {
        try {
            await fetchTimeline(filters);
        } catch (error) {
            console.error('Failed to fetch timeline:', error);
        }
    };

    const handleGenerateStats = async () => {
        try {
            await generateStatistics();
        } catch (error) {
            console.error('Failed to generate statistics:', error);
        }
    };

    const handleFetchMetrics = async () => {
        if (!selectedRepo) {
            alert('Please select a repository');
            return;
        }
        try {
            await fetchUiMetrics(selectedRepo);
        } catch (error) {
            console.error('Failed to fetch UI metrics:', error);
        }
    };

    const handleSyncMetrics = async () => {
        if (!selectedRepo) {
            alert('Please select a repository');
            return;
        }
        try {
            await triggerMetricsSync(selectedRepo);
            // After sync, fetch the metrics
            await fetchUiMetrics(selectedRepo);
        } catch (error) {
            console.error('Failed to sync metrics:', error);
        }
    };

    const clearFilters = () => {
        setFilters({ limit: 10, state: 'all' });
    };

    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            <div className="max-w-[1400px] mx-auto px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN - Results */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header */}
                        <div>
                            <h1 className="text-2xl font-semibold text-[#111111] tracking-tight mb-2">
                                Changelog API Tester
                            </h1>
                            {organization && (
                                <div className="text-sm text-[#6B7280]">
                                    {organization.organization} • {organization.totalRepositories} repos • {organization.totalBranches} branches • {organization.summary.totalCommits} commits • {organization.summary.totalPullRequests} PRs
                                </div>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="bg-white rounded-[20px] p-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex gap-2">
                            {[
                                { key: 'commits', label: 'Commits' },
                                { key: 'prs', label: 'Pull Requests' },
                                { key: 'timeline', label: 'Timeline' },
                                { key: 'stats', label: 'Statistics' },
                                { key: 'sync', label: 'Sync' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key
                                        ? 'bg-[#F3F4F6] text-[#111111]'
                                        : 'text-[#6B7280] hover:bg-[#F9FAFB]'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Results Card */}
                        <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            {/* Loading/Error States */}
                            {getCurrentLoading() && (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#111111]"></div>
                                    <p className="mt-4 text-sm text-[#6B7280]">Loading...</p>
                                </div>
                            )}

                            {getCurrentError() && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm text-red-600">❌ {getCurrentError()}</p>
                                </div>
                            )}

                            {/* Sync Results */}
                            {activeTab === 'sync' && syncResult && !getCurrentLoading() && (
                                <div className="space-y-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <p className="text-sm text-green-800 font-medium">✅ {syncResult.message}</p>
                                        <div className="mt-2 text-sm text-green-700">
                                            <p>Commits synced: {syncResult.synced.commits}</p>
                                            <p>Pull Requests synced: {syncResult.synced.pullRequests}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Commits Results */}
                            {activeTab === 'commits' && commits.length > 0 && !getCurrentLoading() && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-[#111111] mb-4">
                                        Commits ({getCurrentCount()})
                                    </h3>
                                    <div className="space-y-3">
                                        {commits.map((commit, idx) => (
                                            <div key={idx} className="border border-[#E5E7EB] rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0"></div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-[#111111] mb-1">{commit.raw.commit.message}</p>
                                                        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                                                            <span>{commit.author}</span>
                                                            <span>•</span>
                                                            <span>{commit.repoName}/{commit.branchName}</span>
                                                            <span>•</span>
                                                            <span>{new Date(commit.timestamp).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pull Requests Results */}
                            {activeTab === 'prs' && pullRequests.length > 0 && !getCurrentLoading() && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-[#111111] mb-4">
                                        Pull Requests ({getCurrentCount()})
                                    </h3>
                                    <div className="space-y-3">
                                        {pullRequests.map((pr, idx) => (
                                            <div key={idx} className="border border-[#E5E7EB] rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className="text-sm font-medium text-[#111111]">{pr.raw.title}</h4>
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${pr.raw.state === 'open'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-purple-100 text-purple-800'
                                                        }`}>
                                                        {pr.raw.state}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                                                    <span>#{pr.raw.number}</span>
                                                    <span>•</span>
                                                    <span>{pr.author}</span>
                                                    <span>•</span>
                                                    <span>{pr.repoName}</span>
                                                    <span>•</span>
                                                    <span>{new Date(pr.timestamp).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Timeline Results */}
                            {activeTab === 'timeline' && timeline.length > 0 && !getCurrentLoading() && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-[#111111] mb-4">
                                        Timeline ({getCurrentCount()})
                                    </h3>
                                    <div className="space-y-3">
                                        {timeline.map((item, idx) => (
                                            <div key={idx} className="border border-[#E5E7EB] rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.kind === 'COMMIT'
                                                        ? 'bg-blue-100 text-blue-600'
                                                        : 'bg-purple-100 text-purple-600'
                                                        }`}>
                                                        {item.kind === 'COMMIT' ? '📝' : '🔀'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-[#111111] mb-1">
                                                            {item.kind === 'COMMIT' ? item.raw.commit.message : item.raw.title}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                                                            <span className="capitalize">{item.kind}</span>
                                                            <span>•</span>
                                                            <span>{item.author}</span>
                                                            <span>•</span>
                                                            <span>{item.repoName}</span>
                                                            <span>•</span>
                                                            <span>{new Date(item.timestamp).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Statistics Results */}
                            {activeTab === 'stats' && statistics && !getCurrentLoading() && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-[#111111]">Statistics</h3>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-[#F9FAFB] rounded-lg p-4">
                                            <p className="text-sm text-[#6B7280] mb-1">Total Commits</p>
                                            <p className="text-2xl font-bold text-[#111111]">{statistics.totalCommits}</p>
                                        </div>
                                        <div className="bg-[#F9FAFB] rounded-lg p-4">
                                            <p className="text-sm text-[#6B7280] mb-1">Total Pull Requests</p>
                                            <p className="text-2xl font-bold text-[#111111]">{statistics.totalPullRequests}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-base font-semibold text-[#111111] mb-3">Commits by Repo</h4>
                                        <div className="space-y-2">
                                            {Object.entries(statistics.commitsByRepo).map(([repo, count]) => (
                                                <div key={repo} className="flex justify-between items-center text-sm">
                                                    <span className="text-[#6B7280]">{repo}</span>
                                                    <span className="font-medium text-[#111111]">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-base font-semibold text-[#111111] mb-3">Top Contributors</h4>
                                        <div className="space-y-2">
                                            {Object.entries(statistics.commitsByAuthor).slice(0, 5).map(([author, count]) => (
                                                <div key={author} className="flex justify-between items-center text-sm">
                                                    <span className="text-[#6B7280]">{author}</span>
                                                    <span className="font-medium text-[#111111]">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {!getCurrentLoading() && !getCurrentError() && getCurrentCount() === 0 && activeTab !== 'sync' && activeTab !== 'stats' && (
                                <div className="text-center py-12">
                                    <p className="text-[#6B7280]">No data available. Configure filters and fetch data.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Controls */}
                    <div className="space-y-6">
                        {/* Filters Card */}
                        <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            <h3 className="text-base font-semibold text-[#111111] mb-4">Filters</h3>

                            <div className="space-y-4">
                                {/* Repository Filter */}
                                <div>
                                    <label className="block text-sm text-[#6B7280] mb-2">Repository</label>
                                    <select
                                        value={filters.repo || ''}
                                        onChange={(e) => setFilters({ ...filters, repo: e.target.value || undefined })}
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                                    >
                                        <option value="">All Repositories</option>
                                        {availableRepos.map(repo => (
                                            <option key={repo} value={repo}>{repo}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Branch Filter */}
                                <div>
                                    <label className="block text-sm text-[#6B7280] mb-2">Branch</label>
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

                                {/* Author Filter */}
                                <div>
                                    <label className="block text-sm text-[#6B7280] mb-2">Author</label>
                                    <input
                                        type="text"
                                        value={filters.author || ''}
                                        onChange={(e) => setFilters({ ...filters, author: e.target.value || undefined })}
                                        placeholder="Filter by author"
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>

                                {/* State Filter (PRs only) */}
                                {activeTab === 'prs' && (
                                    <div>
                                        <label className="block text-sm text-[#6B7280] mb-2">State</label>
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

                                {/* Date Range */}
                                <div>
                                    <label className="block text-sm text-[#6B7280] mb-2">Since</label>
                                    <input
                                        type="date"
                                        value={filters.since ? filters.since.split('T')[0] : ''}
                                        onChange={(e) => setFilters({ ...filters, since: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-[#6B7280] mb-2">Until</label>
                                    <input
                                        type="date"
                                        value={filters.until ? filters.until.split('T')[0] : ''}
                                        onChange={(e) => setFilters({ ...filters, until: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>

                                {/* Limit */}
                                <div>
                                    <label className="block text-sm text-[#6B7280] mb-2">Limit</label>
                                    <input
                                        type="number"
                                        value={filters.limit || 10}
                                        onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) || 10 })}
                                        min="1"
                                        max="100"
                                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>

                                {/* Clear Filters Button */}
                                <button
                                    onClick={clearFilters}
                                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>

                        {/* Actions Card */}
                        <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            <h3 className="text-base font-semibold text-[#111111] mb-4">Actions</h3>

                            <div className="space-y-3">
                                {activeTab === 'commits' && (
                                    <button
                                        onClick={handleGetCommits}
                                        disabled={isLoadingCommits}
                                        className="w-full px-4 py-3 bg-[#111111] text-white rounded-lg text-sm font-medium hover:bg-[#000000] transition-colors disabled:opacity-50"
                                    >
                                        {isLoadingCommits ? 'Loading...' : 'Fetch Commits'}
                                    </button>
                                )}

                                {activeTab === 'prs' && (
                                    <button
                                        onClick={handleGetPullRequests}
                                        disabled={isLoadingPullRequests}
                                        className="w-full px-4 py-3 bg-[#111111] text-white rounded-lg text-sm font-medium hover:bg-[#000000] transition-colors disabled:opacity-50"
                                    >
                                        {isLoadingPullRequests ? 'Loading...' : 'Fetch Pull Requests'}
                                    </button>
                                )}

                                {activeTab === 'timeline' && (
                                    <button
                                        onClick={handleGetTimeline}
                                        disabled={isLoadingTimeline}
                                        className="w-full px-4 py-3 bg-[#111111] text-white rounded-lg text-sm font-medium hover:bg-[#000000] transition-colors disabled:opacity-50"
                                    >
                                        {isLoadingTimeline ? 'Loading...' : 'Fetch Timeline'}
                                    </button>
                                )}

                                {activeTab === 'stats' && (
                                    <button
                                        onClick={handleGenerateStats}
                                        disabled={isLoadingStatistics}
                                        className="w-full px-4 py-3 bg-[#111111] text-white rounded-lg text-sm font-medium hover:bg-[#000000] transition-colors disabled:opacity-50"
                                    >
                                        {isLoadingStatistics ? 'Loading...' : 'Generate Statistics'}
                                    </button>
                                )}

                                {activeTab === 'sync' && (
                                    <button
                                        onClick={handleTriggerSync}
                                        disabled={isSyncing}
                                        className="w-full px-4 py-3 bg-[#111111] text-white rounded-lg text-sm font-medium hover:bg-[#000000] transition-colors disabled:opacity-50"
                                    >
                                        {isSyncing ? 'Syncing...' : 'Trigger Sync'}
                                    </button>
                                )}


                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangelogTester;
