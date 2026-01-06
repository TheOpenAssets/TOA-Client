import React, { useState, useEffect } from 'react';
import { useChangelogStore } from '../../stores/changelog.store';
import type { ChangelogFilters } from '../../types/changelog.types';

const ChangelogPage: React.FC = () => {
    const {
        // Data
        commits,
        pullRequests,
        timeline,
        statistics,
        syncResult,
        organization,
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
        isLoadingOrganization,
        // Error states
        commitsError,
        pullRequestsError,
        timelineError,
        statisticsError,
        syncError,
        // Actions
        fetchCommits,
        fetchPullRequests,
        fetchTimeline,
        generateStatistics,
        triggerSync,
        fetchOrganization,
    } = useChangelogStore();

    const [activeTab, setActiveTab] = useState<'sync' | 'commits' | 'prs' | 'timeline' | 'stats'>('commits');

    // Filters state
    const [filters, setFilters] = useState<ChangelogFilters>({
        limit: 10,
        state: 'all',
    });

    // Fetch organization data on mount to populate dropdowns
    useEffect(() => {
        fetchOrganization().catch(console.error);
    }, [fetchOrganization]);

    // Get list of repositories from organization data
    const availableRepos = organization?.repositories.map(repo => repo.name) || [];

    // Get list of branches for selected repo
    const availableBranches = filters.repo
        ? organization?.repositories.find(repo => repo.name === filters.repo)?.branches.map(b => b.name) || []
        : [];

    // Helper to get current loading state
    const getCurrentLoading = () => {
        switch (activeTab) {
            case 'sync':
                return isSyncing;
            case 'commits':
                return isLoadingCommits;
            case 'prs':
                return isLoadingPullRequests;
            case 'timeline':
                return isLoadingTimeline;
            case 'stats':
                return isLoadingStatistics;
            default:
                return false;
        }
    };

    // Helper to get current error
    const getCurrentError = () => {
        switch (activeTab) {
            case 'sync':
                return syncError;
            case 'commits':
                return commitsError;
            case 'prs':
                return pullRequestsError;
            case 'timeline':
                return timelineError;
            case 'stats':
                return statisticsError;
            default:
                return null;
        }
    };

    // Helper to get current data
    const getCurrentData = () => {
        switch (activeTab) {
            case 'commits':
                return commits;
            case 'prs':
                return pullRequests;
            case 'timeline':
                return timeline;
            default:
                return [];
        }
    };

    // Helper to get current count
    const getCurrentCount = () => {
        switch (activeTab) {
            case 'commits':
                return commitsCount;
            case 'prs':
                return pullRequestsCount;
            case 'timeline':
                return timelineCount;
            default:
                return 0;
        }
    };

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

    const clearFilters = () => {
        setFilters({ limit: 10, state: 'all' });
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>🔍 Changelog API Tester</h1>
                <p style={styles.subtitle}>Test GitHub Activities Sync Endpoints</p>
                {organization && (
                    <div style={{ marginTop: '15px', fontSize: '0.9em', opacity: 0.9 }}>
                        <p>📂 {organization.organization} • {organization.totalRepositories} repo{organization.totalRepositories !== 1 ? 's' : ''} • {organization.totalBranches} branch{organization.totalBranches !== 1 ? 'es' : ''}</p>
                        <p>📊 {organization.summary.totalCommits} commits • {organization.summary.totalPullRequests} PRs</p>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
                {[
                    { key: 'sync', label: '🔄 Sync', icon: '🔄' },
                    { key: 'commits', label: '📝 Commits', icon: '📝' },
                    { key: 'prs', label: '🔀 Pull Requests', icon: '🔀' },
                    { key: 'timeline', label: '📊 Timeline', icon: '📊' },
                    { key: 'stats', label: '📈 Statistics', icon: '📈' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        style={{
                            ...styles.tab,
                            ...(activeTab === tab.key ? styles.activeTab : {}),
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div style={styles.content}>
                {/* Sync Tab */}
                {activeTab === 'sync' && (
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Trigger Manual Sync</h2>
                        <p style={styles.sectionDesc}>
                            Manually trigger a full sync of repositories, branches, commits, and pull requests from GitHub.
                        </p>
                        <button onClick={handleTriggerSync} disabled={isSyncing} style={styles.primaryButton}>
                            {isSyncing ? '⏳ Syncing...' : '🔄 Trigger Sync'}
                        </button>
                    </div>
                )}

                {/* Commits Tab */}
                {activeTab === 'commits' && (
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Query Commits</h2>

                        <div style={styles.filterGrid}>
                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Repository</label>
                                <select
                                    value={filters.repo || ''}
                                    onChange={(e) => setFilters({ ...filters, repo: e.target.value || undefined, branch: undefined })}
                                    style={styles.select}
                                    disabled={isLoadingOrganization}
                                >
                                    <option value="">All Repositories</option>
                                    {availableRepos.map(repo => (
                                        <option key={repo} value={repo}>{repo}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Branch</label>
                                <select
                                    value={filters.branch || ''}
                                    onChange={(e) => setFilters({ ...filters, branch: e.target.value || undefined })}
                                    style={styles.select}
                                    disabled={!filters.repo || isLoadingOrganization}
                                >
                                    <option value="">All Branches</option>
                                    {availableBranches.map(branch => (
                                        <option key={branch} value={branch}>{branch}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Author</label>
                                <input
                                    type="text"
                                    placeholder="Username or name"
                                    value={filters.author || ''}
                                    onChange={(e) => setFilters({ ...filters, author: e.target.value || undefined })}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Limit</label>
                                <input
                                    type="number"
                                    value={filters.limit || 10}
                                    onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) || 10 })}
                                    style={styles.input}
                                    min="1"
                                    max="1000"
                                />
                            </div>

                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Since Date</label>
                                <input
                                    type="date"
                                    value={filters.since ? filters.since.split('T')[0] : ''}
                                    onChange={(e) => setFilters({ ...filters, since: e.target.value ? `${e.target.value}T00:00:00Z` : undefined })}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Until Date</label>
                                <input
                                    type="date"
                                    value={filters.until ? filters.until.split('T')[0] : ''}
                                    onChange={(e) => setFilters({ ...filters, until: e.target.value ? `${e.target.value}T23:59:59Z` : undefined })}
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        <div style={styles.buttonGroup}>
                            <button onClick={handleGetCommits} disabled={isLoadingCommits} style={styles.primaryButton}>
                                {isLoadingCommits ? '⏳ Loading...' : '🔍 Get Commits'}
                            </button>
                            <button onClick={clearFilters} style={styles.secondaryButton}>
                                🗑️ Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Pull Requests Tab */}
                {activeTab === 'prs' && (
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Query Pull Requests</h2>

                        <div style={styles.filterGrid}>
                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Repository</label>
                                <select
                                    value={filters.repo || ''}
                                    onChange={(e) => setFilters({ ...filters, repo: e.target.value || undefined })}
                                    style={styles.select}
                                    disabled={isLoadingOrganization}
                                >
                                    <option value="">All Repositories</option>
                                    {availableRepos.map(repo => (
                                        <option key={repo} value={repo}>{repo}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.filterGroup}>
                                <label style={styles.label}>State</label>
                                <select
                                    value={filters.state || 'all'}
                                    onChange={(e) => setFilters({ ...filters, state: e.target.value as any })}
                                    style={styles.select}
                                >
                                    <option value="all">All States</option>
                                    <option value="open">Open</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>

                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Limit</label>
                                <input
                                    type="number"
                                    value={filters.limit || 10}
                                    onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) || 10 })}
                                    style={styles.input}
                                    min="1"
                                    max="1000"
                                />
                            </div>
                        </div>

                        <div style={styles.buttonGroup}>
                            <button onClick={handleGetPullRequests} disabled={isLoadingPullRequests} style={styles.primaryButton}>
                                {isLoadingPullRequests ? '⏳ Loading...' : '🔍 Get Pull Requests'}
                            </button>
                            <button onClick={clearFilters} style={styles.secondaryButton}>
                                🗑️ Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Query Timeline</h2>
                        <p style={styles.sectionDesc}>View a mixed timeline of commits and pull requests</p>

                        <div style={styles.filterGrid}>
                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Repository</label>
                                <select
                                    value={filters.repo || ''}
                                    onChange={(e) => setFilters({ ...filters, repo: e.target.value || undefined })}
                                    style={styles.select}
                                    disabled={isLoadingOrganization}
                                >
                                    <option value="">All Repositories</option>
                                    {availableRepos.map(repo => (
                                        <option key={repo} value={repo}>{repo}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Limit</label>
                                <input
                                    type="number"
                                    value={filters.limit || 10}
                                    onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) || 10 })}
                                    style={styles.input}
                                    min="1"
                                    max="1000"
                                />
                            </div>

                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Since Date</label>
                                <input
                                    type="date"
                                    value={filters.since ? filters.since.split('T')[0] : ''}
                                    onChange={(e) => setFilters({ ...filters, since: e.target.value ? `${e.target.value}T00:00:00Z` : undefined })}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.filterGroup}>
                                <label style={styles.label}>Until Date</label>
                                <input
                                    type="date"
                                    value={filters.until ? filters.until.split('T')[0] : ''}
                                    onChange={(e) => setFilters({ ...filters, until: e.target.value ? `${e.target.value}T23:59:59Z` : undefined })}
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        <div style={styles.buttonGroup}>
                            <button onClick={handleGetTimeline} disabled={isLoadingTimeline} style={styles.primaryButton}>
                                {isLoadingTimeline ? '⏳ Loading...' : '🔍 Get Timeline'}
                            </button>
                            <button onClick={clearFilters} style={styles.secondaryButton}>
                                🗑️ Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Statistics Tab */}
                {activeTab === 'stats' && (
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Statistics</h2>
                        <p style={styles.sectionDesc}>View aggregated statistics from all data</p>

                        <button onClick={handleGenerateStats} disabled={isLoadingStatistics} style={styles.primaryButton}>
                            {isLoadingStatistics ? '⏳ Loading...' : '📊 Generate Statistics'}
                        </button>
                    </div>
                )}
            </div>

            {/* Response Area */}
            {(getCurrentData().length > 0 || statistics || syncResult || getCurrentError() || getCurrentLoading()) && (
                <div style={styles.responseArea}>
                    <h3 style={styles.responseTitle}>
                        {getCurrentLoading() ? '⏳ Loading...' : getCurrentError() ? '❌ Error' : '✅ Response'}
                    </h3>

                    {getCurrentError() && (
                        <div style={styles.error}>
                            <p>{getCurrentError()}</p>
                        </div>
                    )}

                    {!getCurrentError() && (
                        <div style={styles.response}>
                            {/* Summary */}
                            {activeTab === 'sync' && syncResult && (
                                <div style={styles.summaryBar}>
                                    <span style={styles.badge}>
                                        Status: {syncResult.success ? '✅ Success' : '❌ Failed'}
                                    </span>
                                    {syncResult.message && (
                                        <span style={styles.badge}>💬 {syncResult.message}</span>
                                    )}
                                    {syncResult.synced && (
                                        <>
                                            <span style={styles.badge}>📝 Commits: {syncResult.synced.commits}</span>
                                            <span style={styles.badge}>🔀 PRs: {syncResult.synced.pullRequests}</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {(activeTab === 'commits' || activeTab === 'prs' || activeTab === 'timeline') && getCurrentData().length > 0 && (
                                <div style={styles.summaryBar}>
                                    <span style={styles.badge}>
                                        Status: ✅ Success
                                    </span>
                                    <span style={styles.badge}>📊 Count: {getCurrentCount()}</span>
                                </div>
                            )}

                            {/* Data Display */}
                            {activeTab === 'stats' && statistics && (
                                <div style={styles.dataContainer}>
                                    {/* Summary */}
                                    <div style={styles.statCard}>
                                        <h4 style={styles.statTitle}>📊 Summary</h4>
                                        <p>Total Commits: <strong>{statistics.totalCommits}</strong></p>
                                        <p>Total Pull Requests: <strong>{statistics.totalPullRequests}</strong></p>
                                    </div>

                                    {/* Commits by Repository */}
                                    <div style={styles.statCard}>
                                        <h4 style={styles.statTitle}>📝 Commits by Repository</h4>
                                        {Object.entries(statistics.commitsByRepo).map(([repo, count]) => (
                                            <p key={repo}>{repo}: <strong>{count}</strong></p>
                                        ))}
                                    </div>

                                    {/* Top Authors */}
                                    <div style={styles.statCard}>
                                        <h4 style={styles.statTitle}>👤 Top Authors</h4>
                                        {Object.entries(statistics.commitsByAuthor)
                                            .sort(([, a], [, b]) => b - a)
                                            .slice(0, 10)
                                            .map(([author, count]) => (
                                                <p key={author}>{author}: <strong>{count}</strong></p>
                                            ))}
                                    </div>

                                    {/* PRs by State */}
                                    <div style={styles.statCard}>
                                        <h4 style={styles.statTitle}>🔀 PRs by State</h4>
                                        {Object.entries(statistics.pullRequestsByState).map(([state, count]) => (
                                            <p key={state}>{state}: <strong>{count}</strong></p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(activeTab === 'commits' || activeTab === 'prs' || activeTab === 'timeline') && getCurrentData().length > 0 && (
                                <div style={styles.dataContainer}>
                                    {getCurrentData().map((item: any, idx: number) => (
                                        <div key={idx} style={styles.dataCard}>
                                            <div style={styles.cardHeader}>
                                                <span style={styles.kindBadge}>{item.kind}</span>
                                                <span style={styles.timestamp}>
                                                    {new Date(item.timestamp).toLocaleString()}
                                                </span>
                                            </div>

                                            <div style={styles.cardBody}>
                                                <p><strong>Repository:</strong> {item.repoName}</p>
                                                {item.branchName && <p><strong>Branch:</strong> {item.branchName}</p>}
                                                <p><strong>Author:</strong> {item.author}</p>

                                                {item.kind === 'COMMIT' && item.raw?.commit?.message && (
                                                    <p><strong>Message:</strong> {item.raw.commit.message.split('\n')[0]}</p>
                                                )}

                                                {item.kind === 'PULL_REQUEST' && item.raw && (
                                                    <>
                                                        <p><strong>PR #{item.raw.number}:</strong> {item.raw.title}</p>
                                                        <p><strong>State:</strong> {item.raw.state}</p>
                                                    </>
                                                )}
                                            </div>

                                            <details style={styles.details}>
                                                <summary style={styles.detailsSummary}>View Raw Data</summary>
                                                <pre style={styles.pre}>{JSON.stringify(item, null, 2)}</pre>
                                            </details>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Full JSON Response */}
                            <details style={styles.details}>
                                <summary style={styles.detailsSummary}>📄 View Full JSON Response</summary>
                                <pre style={styles.pre}>
                                    {activeTab === 'stats' && statistics
                                        ? JSON.stringify(statistics, null, 2)
                                        : activeTab === 'sync' && syncResult
                                            ? JSON.stringify(syncResult, null, 2)
                                            : JSON.stringify({
                                                count: getCurrentCount(),
                                                data: getCurrentData()
                                            }, null, 2)
                                    }
                                </pre>
                            </details>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#f5f7fa',
        minHeight: '100vh',
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px',
        padding: '30px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        color: 'white',
    },
    title: {
        margin: '0 0 10px 0',
        fontSize: '2.5em',
        fontWeight: 'bold',
    },
    subtitle: {
        margin: 0,
        fontSize: '1.1em',
        opacity: 0.9,
    },
    tabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap',
    },
    tab: {
        padding: '12px 24px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'white',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.3s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    activeTab: {
        backgroundColor: '#667eea',
        color: 'white',
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 8px rgba(102, 126, 234, 0.3)',
    },
    content: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    sectionTitle: {
        margin: '0 0 10px 0',
        fontSize: '1.8em',
        color: '#2d3748',
    },
    sectionDesc: {
        margin: 0,
        color: '#718096',
        fontSize: '1em',
    },
    filterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#4a5568',
    },
    input: {
        padding: '10px 12px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        transition: 'border-color 0.3s',
    },
    select: {
        padding: '10px 12px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        backgroundColor: 'white',
        cursor: 'pointer',
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
    },
    primaryButton: {
        padding: '12px 24px',
        backgroundColor: '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s',
        boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
    },
    secondaryButton: {
        padding: '12px 24px',
        backgroundColor: '#f7fafc',
        color: '#4a5568',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s',
    },
    responseArea: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    responseTitle: {
        margin: '0 0 20px 0',
        fontSize: '1.5em',
        color: '#2d3748',
    },
    error: {
        padding: '15px',
        backgroundColor: '#fff5f5',
        border: '2px solid #fc8181',
        borderRadius: '8px',
        color: '#c53030',
    },
    response: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    summaryBar: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        padding: '15px',
        backgroundColor: '#f7fafc',
        borderRadius: '8px',
    },
    badge: {
        padding: '6px 12px',
        backgroundColor: 'white',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    dataContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    dataCard: {
        padding: '20px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        transition: 'all 0.3s',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '10px',
        borderBottom: '1px solid #e2e8f0',
    },
    kindBadge: {
        padding: '4px 12px',
        backgroundColor: '#667eea',
        color: 'white',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
    },
    timestamp: {
        fontSize: '12px',
        color: '#718096',
    },
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '14px',
        color: '#2d3748',
    },
    statCard: {
        padding: '20px',
        backgroundColor: '#f7fafc',
        borderRadius: '8px',
        border: '2px solid #e2e8f0',
    },
    statTitle: {
        margin: '0 0 15px 0',
        fontSize: '1.2em',
        color: '#2d3748',
    },
    details: {
        marginTop: '10px',
    },
    detailsSummary: {
        cursor: 'pointer',
        padding: '10px',
        backgroundColor: '#f7fafc',
        borderRadius: '6px',
        fontWeight: '600',
        color: '#4a5568',
    },
    pre: {
        backgroundColor: '#2d3748',
        color: '#68d391',
        padding: '15px',
        borderRadius: '8px',
        overflow: 'auto',
        fontSize: '12px',
        margin: '10px 0 0 0',
    },
};

export default ChangelogPage;
