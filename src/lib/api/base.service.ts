// src/lib/api/base.service.ts

import { handleAPIError } from '../utils/error-handler';
import { getNetworkFromPath } from '../network/network.config';

/**
 * Utility to create AbortController with timeout
 */
export interface TimeoutController {
  signal: AbortSignal;
  clear: () => void;
}

class BaseService {
  protected get baseURL(): string {
    // All networks are served by one backend. The X-Network header routes the request.
    return import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  }

  protected getHeaders = () => {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'X-Network': getNetworkFromPath(),
    };
    return headers;
  }

  protected getAuthHeaders = (required: boolean = true) => {
    const network = getNetworkFromPath();
    const token =
      localStorage.getItem(`${network}_access_token`) ??
      localStorage.getItem('access_token'); // legacy fallback

    if (!token && required) {
      console.warn(`[BaseService] Missing token for required auth. Network: ${network}`);
      handleAPIError(new Error('Not a verified user'));
    }

    return {
      ...this.getHeaders(),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  /**
   * Create an AbortController with timeout
   * Prevents API calls from hanging indefinitely
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

      if (response.status === 401) {
        const errorData = await response.clone().json().catch(() => ({}));

        if (errorData.message === 'Unauthorized' || errorData.statusCode === 401) {
          console.log('🔒 401 Unauthorized detected in API response - Triggering logout');

          const { handle401Unauthorized } = await import('../utils/error-handler');
          handle401Unauthorized();

          throw new Error('Unauthorized');
        }
      }

      return response;
    } catch (error: any) {
      clear();

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
