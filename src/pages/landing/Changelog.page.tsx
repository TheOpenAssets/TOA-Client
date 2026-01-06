import React, { useState, useEffect } from 'react';
import { useChangelogStore } from '../../stores/changelog.store';
import { GitHubCalendar, CustomGitGraph, ChangelogTester } from '../../components/changelog';

const ChangelogPage: React.FC = () => {
    const {
        organization,
        uiMetrics,
        contributors,
        isLoadingMetrics,
        isSyncingMetrics,
        metricsError,
        fetchOrganization,
        fetchUiMetrics,
        triggerMetricsSync,
    } = useChangelogStore();

    const [selectedRepo, setSelectedRepo] = useState<string>('');

    useEffect(() => {
        fetchOrganization().catch(console.error);
    }, []);

    const availableRepos = organization?.repositories.map(repo => repo.name) || [];

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
            await fetchUiMetrics(selectedRepo);
        } catch (error) {
            console.error('Failed to sync metrics:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            <div className="max-w-[1400px] mx-auto px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#111111] tracking-tight mb-2">
                        Changelog
                    </h1>
                    {organization && (
                        <p className="text-sm text-[#6B7280]">
                            {organization.organization} • {organization.totalRepositories} repos • {organization.totalBranches} branches
                        </p>
                    )}
                </div>

                <ChangelogTester />

                {/* Repository Selection */}
                <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-6">
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-[#111111] mb-2">
                                Select Repository
                            </label>
                            <select
                                value={selectedRepo}
                                onChange={(e) => setSelectedRepo(e.target.value)}
                                className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                            >
                                <option value="">Choose a repository...</option>
                                {availableRepos.map(repo => (
                                    <option key={repo} value={repo}>{repo}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleFetchMetrics}
                            disabled={isLoadingMetrics || !selectedRepo}
                            className="px-6 py-2.5 bg-[#111111] text-white rounded-lg text-sm font-medium hover:bg-[#000000] transition-colors disabled:opacity-50"
                        >
                            {isLoadingMetrics ? 'Loading...' : 'Load Data'}
                        </button>
                        <button
                            onClick={handleSyncMetrics}
                            disabled={isSyncingMetrics || !selectedRepo}
                            className="px-6 py-2.5 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#111111] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
                        >
                            {isSyncingMetrics ? 'Syncing...' : 'Sync'}
                        </button>
                    </div>

                    {metricsError && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-600">❌ {metricsError}</p>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {isLoadingMetrics && (
                    <div className="bg-white rounded-[20px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#111111]"></div>
                        <p className="mt-4 text-sm text-[#6B7280]">Loading metrics...</p>
                    </div>
                )}

                {/* Content */}
                {!isLoadingMetrics && uiMetrics && selectedRepo && (
                    <div className="space-y-6">
                        {/* GitHub Contribution Calendar */}
                        {uiMetrics.contributionData && (
                            <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <h2 className="text-xl font-semibold text-[#111111] mb-6">
                                    Contribution Activity
                                </h2>
                                <div className='w-full h-full '>

                                <GitHubCalendar data={uiMetrics.contributionData} />
                                </div>
                            </div>
                        )}

                        {/* Commit Graph */}
                        {uiMetrics.graphData && uiMetrics.graphData.commits && (
                            <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <h2 className="text-xl font-semibold text-[#111111] mb-6">
                                    Commit Graph
                                </h2>
                                <CustomGitGraph
                                    commits={uiMetrics.graphData.commits}
                                    branchHeads={uiMetrics.graphData.branchHeads}
                                    contributors={uiMetrics.contributors}
                                />
                            </div>
                        )}

                        {/* Contributors */}
                        {contributors && contributors.length > 0 && (
                            <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <h2 className="text-xl font-semibold text-[#111111] mb-6">
                                    Contributors
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {contributors.map((contributor, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-4 border border-[#E5E7EB] rounded-lg hover:border-[#111111] transition-colors">
                                            <div className="w-12 h-12 rounded-full ">
                                                <img className="w-full h-full rounded-full object-cover" src={contributor.avatarUrl} alt={contributor.name} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#111111] truncate">{contributor.name}</p>
                                                <a
                                                    href={contributor.profileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:underline"
                                                >
                                                    View Profile →
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!isLoadingMetrics && !uiMetrics && !selectedRepo && (
                    <div className="bg-white rounded-[20px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
                        <div className="text-4xl mb-4">📊</div>
                        <h3 className="text-lg font-semibold text-[#111111] mb-2">
                            Select a Repository
                        </h3>
                        <p className="text-sm text-[#6B7280]">
                            Choose a repository from the dropdown above to view its changelog and metrics.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangelogPage;
