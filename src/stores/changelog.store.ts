// src/stores/changelog.store.ts

import { create } from 'zustand';
import type {
    CommitActivity,
    PullRequestActivity,
    TimelineActivity,
    ChangelogFilters,
    ChangelogStatistics,
    SyncResponse,
    OrganizationDetails,
    OrganizationFilters,
} from '../types/changelog.types';
import { changelogService } from '../lib/api/changelog.service';

interface ChangelogState {
    // Data state
    commits: CommitActivity[];
    pullRequests: PullRequestActivity[];
    timeline: TimelineActivity[];
    statistics: ChangelogStatistics | null;
    syncResult: SyncResponse | null;
    organization: OrganizationDetails | null;

    // Loading states
    isLoadingCommits: boolean;
    isLoadingPullRequests: boolean;
    isLoadingTimeline: boolean;
    isLoadingStatistics: boolean;
    isSyncing: boolean;
    isLoadingOrganization: boolean;

    // Error states
    commitsError: string | null;
    pullRequestsError: string | null;
    timelineError: string | null;
    statisticsError: string | null;
    syncError: string | null;
    organizationError: string | null;

    // Metadata
    commitsCount: number;
    pullRequestsCount: number;
    timelineCount: number;

    // Actions
    fetchCommits: (filters?: ChangelogFilters) => Promise<void>;
    fetchPullRequests: (filters?: ChangelogFilters) => Promise<void>;
    fetchTimeline: (filters?: ChangelogFilters) => Promise<void>;
    generateStatistics: () => Promise<void>;
    triggerSync: () => Promise<void>;
    fetchOrganization: (filters?: OrganizationFilters) => Promise<void>;
    clearErrors: () => void;
    clearCommits: () => void;
    clearPullRequests: () => void;
    clearTimeline: () => void;
    clearStatistics: () => void;
    clearOrganization: () => void;
}

export const useChangelogStore = create<ChangelogState>((set) => ({
    // Initial state
    commits: [],
    pullRequests: [],
    timeline: [],
    statistics: null,
    syncResult: null,
    organization: null,

    isLoadingCommits: false,
    isLoadingPullRequests: false,
    isLoadingTimeline: false,
    isLoadingStatistics: false,
    isSyncing: false,
    isLoadingOrganization: false,

    commitsError: null,
    pullRequestsError: null,
    timelineError: null,
    statisticsError: null,
    syncError: null,
    organizationError: null,

    commitsCount: 0,
    pullRequestsCount: 0,
    timelineCount: 0,

    // Actions

    /**
     * Fetch commits with optional filters
     */
    fetchCommits: async (filters?: ChangelogFilters) => {
        set({ isLoadingCommits: true, commitsError: null });

        try {
            const response = await changelogService.getCommits(filters);
            set({
                commits: response.data,
                commitsCount: response.count,
                isLoadingCommits: false,
            });
        } catch (error: any) {
            set({
                commitsError: error.message || 'Failed to fetch commits',
                isLoadingCommits: false,
            });
            throw error;
        }
    },

    /**
     * Fetch pull requests with optional filters
     */
    fetchPullRequests: async (filters?: ChangelogFilters) => {
        set({ isLoadingPullRequests: true, pullRequestsError: null });

        try {
            const response = await changelogService.getPullRequests(filters);
            set({
                pullRequests: response.data,
                pullRequestsCount: response.count,
                isLoadingPullRequests: false,
            });
        } catch (error: any) {
            set({
                pullRequestsError: error.message || 'Failed to fetch pull requests',
                isLoadingPullRequests: false,
            });
            throw error;
        }
    },

    /**
     * Fetch timeline (mixed commits and PRs) with optional filters
     */
    fetchTimeline: async (filters?: ChangelogFilters) => {
        set({ isLoadingTimeline: true, timelineError: null });

        try {
            const response = await changelogService.getTimeline(filters);
            set({
                timeline: response.data,
                timelineCount: response.count,
                isLoadingTimeline: false,
            });
        } catch (error: any) {
            set({
                timelineError: error.message || 'Failed to fetch timeline',
                isLoadingTimeline: false,
            });
            throw error;
        }
    },

    /**
     * Generate statistics from all commits and pull requests
     * Fetches data with high limit to calculate comprehensive statistics
     */
    generateStatistics: async () => {
        set({ isLoadingStatistics: true, statisticsError: null });

        try {
            // Fetch all data with high limit
            const [commitsResponse, prsResponse] = await Promise.all([
                changelogService.getCommits({ limit: 1000 }),
                changelogService.getPullRequests({ limit: 1000 }),
            ]);

            const commits = commitsResponse.data;
            const prs = prsResponse.data;

            // Calculate statistics
            const commitsByRepo = commits.reduce((acc, commit) => {
                acc[commit.repoName] = (acc[commit.repoName] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const commitsByAuthor = commits.reduce((acc, commit) => {
                acc[commit.author] = (acc[commit.author] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const commitsByBranch = commits.reduce((acc, commit) => {
                const branch = commit.branchName || 'unknown';
                acc[branch] = (acc[branch] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const prsByState = prs.reduce((acc, pr) => {
                acc[pr.raw.state] = (acc[pr.raw.state] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const prsByRepo = prs.reduce((acc, pr) => {
                acc[pr.repoName] = (acc[pr.repoName] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const statistics: ChangelogStatistics = {
                totalCommits: commitsResponse.count,
                totalPullRequests: prsResponse.count,
                commitsByRepo,
                commitsByAuthor,
                commitsByBranch,
                pullRequestsByState: prsByState,
                pullRequestsByRepo: prsByRepo,
            };

            set({
                statistics,
                isLoadingStatistics: false,
            });
        } catch (error: any) {
            set({
                statisticsError: error.message || 'Failed to generate statistics',
                isLoadingStatistics: false,
            });
            throw error;
        }
    },

    /**
     * Trigger manual sync of GitHub activities
     */
    triggerSync: async () => {
        set({ isSyncing: true, syncError: null });

        try {
            const response = await changelogService.triggerSync();
            set({
                syncResult: response,
                isSyncing: false,
            });
        } catch (error: any) {
            set({
                syncError: error.message || 'Failed to trigger sync',
                isSyncing: false,
            });
            throw error;
        }
    },

    /**
     * Fetch organization details with repositories and branches
     * Useful for populating repo and branch dropdowns
     */
    fetchOrganization: async (filters?: OrganizationFilters) => {
        set({ isLoadingOrganization: true, organizationError: null });

        try {
            const response = await changelogService.getOrganization(filters);
            set({
                organization: response.data,
                isLoadingOrganization: false,
            });
        } catch (error: any) {
            set({
                organizationError: error.message || 'Failed to fetch organization details',
                isLoadingOrganization: false,
            });
            throw error;
        }
    },

    /**
     * Clear all errors
     */
    clearErrors: () => {
        set({
            commitsError: null,
            pullRequestsError: null,
            timelineError: null,
            statisticsError: null,
            syncError: null,
            organizationError: null,
        });
    },

    /**
     * Clear commits data
     */
    clearCommits: () => {
        set({
            commits: [],
            commitsCount: 0,
            commitsError: null,
        });
    },

    /**
     * Clear pull requests data
     */
    clearPullRequests: () => {
        set({
            pullRequests: [],
            pullRequestsCount: 0,
            pullRequestsError: null,
        });
    },

    /**
     * Clear timeline data
     */
    clearTimeline: () => {
        set({
            timeline: [],
            timelineCount: 0,
            timelineError: null,
        });
    },

    /**
     * Clear statistics data
     */
    clearStatistics: () => {
        set({
            statistics: null,
            statisticsError: null,
        });
    },

    /**
     * Clear organization data
     */
    clearOrganization: () => {
        set({
            organization: null,
            organizationError: null,
        });
    },
}));

export default useChangelogStore;
