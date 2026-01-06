import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChangelogStore } from '../../stores/changelog.store';
import { GitHubCalendar, CustomGitGraph, ChangelogTester } from '../../components/changelog';

const ChangelogPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        organization,
        uiMetrics,
        contributors,
        isLoadingMetrics,
        metricsError,
        fetchOrganization,
        fetchUiMetrics,
    } = useChangelogStore();

    const [selectedRepo, setSelectedRepo] = useState<string>('');
    const [showTester, setShowTester] = useState(false);

    useEffect(() => {
        fetchOrganization().catch(console.error);
    }, []);

    // Auto-load first repo when organization data is available
    useEffect(() => {
        if (organization && organization.repositories.length > 0 && !selectedRepo) {
            const firstRepo = organization.repositories[0].name;
            setSelectedRepo(firstRepo);
            fetchUiMetrics(firstRepo).catch(console.error);
        }
    }, [organization]);

    const availableRepos = organization?.repositories.map(repo => repo.name) || [];

    const handleRepoChange = async (repo: string) => {
        setSelectedRepo(repo);
        if (repo) {
            try {
                await fetchUiMetrics(repo);
            } catch (error) {
                console.error('Failed to fetch UI metrics:', error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            {/* Top Navigation Bar - Marketplace Style */}
            <header className="w-full flex flex-row z-40 mt-2 mb-1 max-w-[85vw] mx-auto">
                {/* Logo */}
                <div className='flex flex-row items-center justify-center'>
                <img
                    src="./ALogo-removebg-preview.svg"
                    alt="Logo"
                    className="h-16 w-auto object-contain cursor-pointer"
                    onClick={() => navigate('/')}
                    />
                <span className="text-xl font-bold font-gellix text-foreground">OpenAssets</span>
                    </div>
                    <div className="flex flex-row items-center justify-end w-full gap-10 mr-10">
                    {/* Center: Organization Info */}
                    {organization && (
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span className="font-gellix font-medium text-foreground">{organization.totalRepositories}</span>
                                <span className="font-gellix">repos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="font-gellix font-medium text-foreground">{organization.summary.totalCommits}</span>
                                <span className="font-gellix">commits</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01" />
                                </svg>
                                <span className="font-gellix font-medium text-foreground">{organization.summary.totalPullRequests}</span>
                                <span className="font-gellix">PRs</span>
                            </div>
                        </div>
                    )}

                    {/* Right: Repository Selection + Sync */}
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedRepo}
                            onChange={(e) => handleRepoChange(e.target.value)}
                            className="p-2 bg-transparent border border-gray-200 rounded-lg font-gellix text-sm font-medium rounded-xl text-foreground focus:outline-none focus:border-gray-400"
                        >
                            <option value="">Select Repository</option>
                            {availableRepos.map(repo => (
                                <option key={repo} value={repo}>{repo}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            <div className="max-w-[85vw] mx-auto px-8 py-8">
                {/* Error Message */}
                {metricsError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-red-600 font-gellix">❌ {metricsError}</p>
                    </div>
                )}

                {/* Loading State */}
                {isLoadingMetrics && (
                    <div className="bg-white rounded-[20px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#111111]"></div>
                        <p className="mt-4 text-sm text-[#6B7280] font-gellix">Loading metrics...</p>
                    </div>
                )}

                {/* Content */}
                {!isLoadingMetrics && uiMetrics && selectedRepo && (
                    <div className="space-y-6">
                        {/* Commit Graph - First */}
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

                        {/* GitHub Contribution Calendar - Second */}
                        {uiMetrics.contributionData && (
                            <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <h2 className="text-xl font-semibold text-[#111111] mb-6">
                                    Contribution Activity
                                </h2>
                                <GitHubCalendar data={uiMetrics.contributionData} />
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
                                            <div className="w-12 h-12 rounded-full">
                                                <img className="w-full h-full rounded-full object-cover" src={contributor.avatarUrl} alt={contributor.name} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#111111] truncate">{contributor.name}</p>
                                                <a
                                                    href={contributor.profileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-[#6B7280] hover:text-[#111111] transition-colors"
                                                >
                                                    View Profile →
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* API Tester - Collapsible */}
                        <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            <button
                                onClick={() => setShowTester(!showTester)}
                                className="w-full flex items-center justify-between text-left group"
                            >
                                <div>
                                    <h2 className="text-xl font-semibold text-[#111111] mb-2 group-hover:text-[#000000] transition-colors">
                                        Want to see our work in actual detail?
                                    </h2>
                                    <p className="text-sm text-[#6B7280]">
                                        Check out commits and PR responses from our repositories
                                    </p>
                                </div>
                                <svg
                                    className={`w-6 h-6 text-[#6B7280] transition-transform ${showTester ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showTester && (
                                <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                                    <ChangelogTester
                                        selectedRepo={selectedRepo}
                                        onRepoChange={handleRepoChange}
                                        contributors={contributors}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangelogPage;
