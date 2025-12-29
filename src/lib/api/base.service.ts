
// src/lib/api/base.service.ts

import { handleAPIError } from '../utils/error-handler';

/**
 * Utility to create AbortController with timeout
 */
export interface TimeoutController {
  signal: AbortSignal;
  clear: () => void;
}

class BaseService {
  protected baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  protected getHeaders = () => {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };

    return headers;
  }

  protected getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      // This will trigger the error handler which redirects to /verify-challenge
      handleAPIError(new Error('Not a verified user, please solve the challenge'));
    }
    return {
      ...this.getHeaders(),
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Create an AbortController with timeout
   * Prevents API calls from hanging indefinitely
   *
   * @param timeoutMs - Timeout in milliseconds (default: 30000 = 30 seconds)
   * @returns TimeoutController with signal and clear function
   *
   * @example
   * const { signal, clear } = this.createTimeout(60000); // 1 minute
   * try {
   *   const response = await fetch(url, { signal });
   *   clear();
   *   return await response.json();
   * } finally {
   *   clear(); // Always clear timeout
   * }
   */
  protected createTimeout(timeoutMs: number = 30000): TimeoutController {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return {
      signal: controller.signal,
      clear: () => clearTimeout(timeoutId),
    };
  }

  /**
   * Fetch with automatic timeout protection
   * Wraps fetch with AbortController and timeout
   *
   * @param url - The URL to fetch
   * @param options - Fetch options (will be merged with timeout signal)
   * @param timeoutMs - Timeout in milliseconds (default: 30000 = 30 seconds)
   * @returns Fetch response
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<Response> {
    const { signal, clear } = this.createTimeout(timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal,
      });
      clear();
      return response;
    } catch (error: any) {
      clear();
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }
}

export default BaseService;

