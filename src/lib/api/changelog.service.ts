// src/lib/api/changelog.service.ts

import BaseService from './base.service';
import type {
    CommitsResponse,
    PullRequestsResponse,
    TimelineResponse,
    SyncResponse,
    ChangelogFilters,
    OrganizationResponse,
    OrganizationFilters,
    GitMetricsResponse,
    SyncMetricsResponse,
} from '../../types/changelog.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Changelog Service - Handles GitHub activities and changelog API calls
 *
 * Endpoints:
 * - POST /changelog/sync - Trigger manual sync
 * - GET /changelog/commits - Get commit history
 * - GET /changelog/pull-requests - Get pull requests
 * - GET /changelog/timeline - Get mixed timeline
 */
class ChangelogService extends BaseService {
    constructor() {
        super(API_BASE_URL);
    }

    /**
     * Build query string from filters
     * Excludes 'all' state value as it means no filter
     */
    private buildQueryString(filters?: ChangelogFilters): string {
        if (!filters) return '';

        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            // Skip 'all' state value as it means no filter
            if (key === 'state' && value === 'all') {
                return;
            }

            if (value !== undefined && value !== '' && value !== null) {
                params.append(key, String(value));
            }
        });

        return params.toString() ? `?${params.toString()}` : '';
    }

    /**
     * Trigger manual sync of repositories, branches, commits, and pull requests
     *
     * ENDPOINT: POST /changelog/sync
     *
     * BACKEND RESPONSE:
     * {
     *   success: boolean,
     *   message: string,
     *   synced: {
     *     commits: number,
     *     pullRequests: number
     *   }
     * }
     */
    async triggerSync(): Promise<SyncResponse> {
        try {
            const response = await fetch(`${this.baseURL}/changelog/sync`, {
                method: 'POST',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to trigger sync');
            }

            const data: SyncResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error triggering sync:', error);
            throw error;
        }
    }

    /**
     * Get commit history with optional filters
     *
     * ENDPOINT: GET /changelog/commits
     *
     * Query Parameters:
     * - repo: Filter by repository name
     * - branch: Filter by branch name
     * - author: Filter by author username/name
     * - since: ISO date string for start date
     * - until: ISO date string for end date
     * - limit: Maximum number of results (default: 10)
     *
     * BACKEND RESPONSE:
     * {
     *   success: boolean,
     *   count: number,
     *   data: CommitActivity[],
     *   filters: ChangelogFilters
     * }
     */
    async getCommits(filters?: ChangelogFilters): Promise<CommitsResponse> {
        try {
            const queryString = this.buildQueryString(filters);
            const response = await fetch(`${this.baseURL}/changelog/commits${queryString}`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch commits');
            }

            const data: CommitsResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching commits:', error);
            throw error;
        }
    }

    /**
     * Get pull requests with optional filters
     *
     * ENDPOINT: GET /changelog/pull-requests
     *
     * Query Parameters:
     * - repo: Filter by repository name
     * - state: Filter by state ('open' or 'closed', don't pass 'all')
     * - author: Filter by author username
     * - since: ISO date string for start date
     * - until: ISO date string for end date
     * - limit: Maximum number of results (default: 10)
     *
     * BACKEND RESPONSE:
     * {
     *   success: boolean,
     *   count: number,
     *   data: PullRequestActivity[],
     *   filters: ChangelogFilters
     * }
     */
    async getPullRequests(filters?: ChangelogFilters): Promise<PullRequestsResponse> {
        try {
            const queryString = this.buildQueryString(filters);
            const response = await fetch(`${this.baseURL}/changelog/pull-requests${queryString}`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch pull requests');
            }

            const data: PullRequestsResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching pull requests:', error);
            throw error;
        }
    }

    /**
     * Get timeline (mixed commits and pull requests)
     *
     * ENDPOINT: GET /changelog/timeline
     *
     * Query Parameters:
     * - repo: Filter by repository name
     * - since: ISO date string for start date
     * - until: ISO date string for end date
     * - limit: Maximum number of results (default: 15)
     *
     * BACKEND RESPONSE:
     * {
     *   success: boolean,
     *   count: number,
     *   data: TimelineActivity[],
     *   filters: ChangelogFilters
     * }
     */
    async getTimeline(filters?: ChangelogFilters): Promise<TimelineResponse> {
        try {
            const queryString = this.buildQueryString(filters);
            const response = await fetch(`${this.baseURL}/changelog/timeline${queryString}`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch timeline');
            }

            const data: TimelineResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching timeline:', error);
            throw error;
        }
    }

    /**
     * Get organization details with repositories and branches
     *
     * ENDPOINT: GET /changelog/organization
     *
     * Query Parameters:
     * - repo: Optional filter by specific repository name
     *
     * BACKEND RESPONSE:
     * {
     *   success: boolean,
     *   data: {
     *     organization: string,
     *     configuredRepositories: string[],
     *     totalRepositories: number,
     *     totalBranches: number,
     *     repositories: RepositoryInfo[],
     *     summary: { totalCommits: number, totalPullRequests: number }
     *   }
     * }
     */
    async getOrganization(filters?: OrganizationFilters): Promise<OrganizationResponse> {
        try {
            const queryString = filters?.repo ? `?repo=${filters.repo}` : '';
            const response = await fetch(`${this.baseURL}/changelog/organization${queryString}`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch organization details');
            }

            const data: OrganizationResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching organization details:', error);
            throw error;
        }
    }

    /**
     * Get UI metrics for a repository
     *
     * ENDPOINT: GET /ui-metrics/:repoName
     *
     * BACKEND RESPONSE:
     * {
     *   success: boolean,
     *   data: GitMetrics
     * }
     */
    async getUiMetrics(repoName: string): Promise<GitMetricsResponse> {
        try {
            const response = await fetch(`${this.baseURL}/ui-metrics/${repoName}`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch UI metrics');
            }

            const data: GitMetricsResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching UI metrics:', error);
            throw error;
        }
    }

    /**
     * Trigger metrics sync for a repository
     *
     * ENDPOINT: POST /ui-metrics/sync/:repoName
     *
     * BACKEND RESPONSE:
     * {
     *   success: boolean,
     *   message: string
     * }
     */
    async triggerMetricsSync(repoName: string): Promise<SyncMetricsResponse> {
        try {
            const response = await fetch(`${this.baseURL}/ui-metrics/sync/${repoName}`, {
                method: 'POST',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to trigger metrics sync');
            }

            const data: SyncMetricsResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error triggering metrics sync:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const changelogService = new ChangelogService();
export default changelogService;
