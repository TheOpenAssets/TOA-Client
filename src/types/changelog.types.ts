// src/types/changelog.types.ts

/**
 * Changelog Types
 * Types for GitHub Activities and Changelog API integration
 */

// ==================== Base Types ====================

export type ChangelogKind = 'COMMIT' | 'PULL_REQUEST';

export type PullRequestState = 'open' | 'closed';

// ==================== Filters ====================

export interface ChangelogFilters {
    repo?: string;
    branch?: string;
    author?: string;
    state?: PullRequestState | 'all';
    since?: string; // ISO date string
    until?: string; // ISO date string
    limit?: number;
}

// ==================== Raw GitHub Data ====================

export interface RawCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            name: string;
            email: string;
            date: string;
        };
        committer: {
            name: string;
            email: string;
            date: string;
        };
    };
    author: {
        login: string;
        avatar_url: string;
    } | null;
    html_url: string;
}

export interface RawPullRequest {
    id: number;
    number: number;
    title: string;
    state: PullRequestState;
    html_url: string;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
    user: {
        login: string;
        avatar_url: string;
    };
    head: {
        ref: string;
        sha: string;
    };
    base: {
        ref: string;
        sha: string;
    };
    body: string | null;
    labels: Array<{
        name: string;
        color: string;
    }>;
}

// ==================== Activity Types ====================

export interface CommitActivity {
    _id: string;
    kind: 'COMMIT';
    platformId: string; // SHA
    repoName: string;
    branchName: string;
    author: string;
    timestamp: string;
    raw: RawCommit;
    createdAt: string;
    updatedAt: string;
}

export interface PullRequestActivity {
    _id: string;
    kind: 'PULL_REQUEST';
    platformId: string; // PR ID
    repoName: string;
    branchName: string; // head branch
    author: string;
    timestamp: string;
    raw: RawPullRequest;
    createdAt: string;
    updatedAt: string;
}

export type TimelineActivity = CommitActivity | PullRequestActivity;

// ==================== API Response Types ====================

export interface BaseChangelogResponse {
    success: boolean;
    message?: string;
    timestamp?: string;
    filters?: ChangelogFilters;
}

export interface CommitsResponse extends BaseChangelogResponse {
    count: number;
    data: CommitActivity[];
}

export interface PullRequestsResponse extends BaseChangelogResponse {
    count: number;
    data: PullRequestActivity[];
}

export interface TimelineResponse extends BaseChangelogResponse {
    count: number;
    data: TimelineActivity[];
}

export interface SyncResponse extends BaseChangelogResponse {
    synced: {
        commits: number;
        pullRequests: number;
    };
}

// ==================== Statistics Types ====================

export interface CommitsByRepo {
    [repoName: string]: number;
}

export interface CommitsByAuthor {
    [author: string]: number;
}

export interface CommitsByBranch {
    [branch: string]: number;
}

export interface PullRequestsByState {
    [state: string]: number;
}

export interface PullRequestsByRepo {
    [repoName: string]: number;
}

export interface ChangelogStatistics {
    totalCommits: number;
    totalPullRequests: number;
    commitsByRepo: CommitsByRepo;
    commitsByAuthor: CommitsByAuthor;
    commitsByBranch: CommitsByBranch;
    pullRequestsByState: PullRequestsByState;
    pullRequestsByRepo: PullRequestsByRepo;
}

// ==================== Organization Types ====================

export interface BranchInfo {
    name: string;
    lastCommitSha: string;
    protected: boolean;
    updatedAt: string;
}

export interface RepositoryStatistics {
    totalBranches: number;
    totalCommits: number;
    totalPullRequests: number;
}

export interface RepositoryInfo {
    id: string;
    name: string;
    owner: string;
    createdAt: string;
    url: string;
    description: string;
    defaultBranch: string;
    isPrivate: boolean;
    statistics: RepositoryStatistics;
    branches: BranchInfo[];
}

export interface OrganizationSummary {
    totalCommits: number;
    totalPullRequests: number;
}

export interface OrganizationDetails {
    organization: string;
    syncedRespositories: string[];
    configuredRepositories: string[];
    totalRepositories: number;
    totalBranches: number;
    repositories: RepositoryInfo[];
    summary: OrganizationSummary;
}

export interface OrganizationResponse extends BaseChangelogResponse {
    data: OrganizationDetails;
}

export interface OrganizationFilters {
    repo?: string;
}

// ==================== UI Metrics Types ====================

export interface ContributionDay {
    date: string; // ISO date string
    count: number;
    level: number; // 0-4 for color intensity
}

export interface Contributor {
    name: string;
    author: string;
    avatarUrl: string;
    profileUrl: string;
}

export interface CommitGraphCommit {
    sha: string;
    commit: {
        author: {
            name: string;
            date: string;
            email?: string;
        };
        message: string;
    };
    parents: Array<{ sha: string }>;
    html_url: string;
}

export interface CommitGraphBranch {
    name: string;
    commit: {
        sha: string;
    };
    link: string;
}

export interface GitMetrics {
    repoName: string;
    contributionData: ContributionDay[];
    graphData: {
        commits: CommitGraphCommit[];
        branchHeads: CommitGraphBranch[];
    };
    contributors: Contributor[];
}

export interface GitMetricsResponse extends BaseChangelogResponse {
    data: GitMetrics;
}

export interface SyncMetricsResponse extends BaseChangelogResponse {
    message: string;
}
