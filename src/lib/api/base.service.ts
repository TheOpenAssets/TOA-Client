
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
  private _baseURL: string;

  constructor(baseURL?: string) {
    this._baseURL = baseURL ?? '';
  }

  protected get baseURL(): string {
    if (this._baseURL) return this._baseURL;

    // Dynamic resolution from current route
    const segment = window.location.pathname.split('/')[1];
    if (segment === 'stellar') {
      return import.meta.env.VITE_STELLAR_API_URL ?? 'http://localhost:3001';
    }
    return import.meta.env.VITE_ARBITRUM_API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  }

  protected getHeaders = () => {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };

    return headers;
  }

  protected getAuthHeaders = (required: boolean = true) => {
    const segment = window.location.pathname.split('/')[1];
    const network = ['arbitrum', 'stellar'].includes(segment) ? segment : 'arbitrum';

    const token = localStorage.getItem(`${network}_access_token`)
      ?? localStorage.getItem('access_token'); // legacy fallback

    // Debug log to trace auth issues
    // console.log(`[BaseService] getAuthHeaders: network=${network}, required=${required}, hasToken=${!!token}`);

    if (!token && required) {
      console.warn(`[BaseService] Missing token for required auth. Network: ${network}`);
      handleAPIError(new Error('Not a verified user'));
    }

    const headers = {
      ...this.getHeaders(),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    return headers;
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
   * Fetch with automatic timeout protection and 401 handling
   * Wraps fetch with AbortController and timeout
   * Automatically logs out user on 401 Unauthorized responses
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

      // Check for 401 Unauthorized response
      if (response.status === 401) {
        // Parse response to check the message
        const errorData = await response.clone().json().catch(() => ({}));

        // Check if it's an Unauthorized error
        if (errorData.message === 'Unauthorized' || errorData.statusCode === 401) {
          console.log('🔒 401 Unauthorized detected in API response - Triggering logout');

          // Import and call the 401 handler
          const { handle401Unauthorized } = await import('../utils/error-handler');
          handle401Unauthorized();

          // Throw error to stop execution
          throw new Error('Unauthorized');
        }
      }

      return response;
    } catch (error: any) {
      clear();

      // Check if the error itself indicates 401
      if (error.message === 'Unauthorized' || error.status === 401 || error.statusCode === 401) {
        const { handle401Unauthorized } = await import('../utils/error-handler');
        handle401Unauthorized();
      }

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }
}

export default BaseService;

