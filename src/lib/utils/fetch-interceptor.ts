/**
 * Global Fetch Interceptor
 * Intercepts all fetch requests to handle 401 Unauthorized errors globally
 */

import { handle401Unauthorized } from './error-handler';

/**
 * Setup global fetch interceptor
 * This wraps the native fetch function to automatically handle 401 errors
 */
export const setupFetchInterceptor = () => {
  // Store the original fetch function
  const originalFetch = window.fetch;

  // Override the global fetch
  window.fetch = async (...args) => {
    try {
      // Call the original fetch
      const response = await originalFetch(...args);

      // Clone the response to read it without consuming the stream
      const clonedResponse = response.clone();

      // Check for 401 status
      if (response.status === 401) {
        try {
          // Try to parse the response body
          const data = await clonedResponse.json();

          // Check if it's an Unauthorized error
          if (data.message === 'Unauthorized' || data.statusCode === 401) {
            console.log('🔒 Global fetch interceptor: 401 Unauthorized detected');
            handle401Unauthorized();

            // Return the original response so the caller can handle it too
            return response;
          }
        } catch (parseError) {
          // If JSON parsing fails, still check the status
          console.log('🔒 Global fetch interceptor: 401 status detected (non-JSON response)');
          handle401Unauthorized();
          return response;
        }
      }

      return response;
    } catch (error: any) {
      // If there's a network error or other error, just rethrow it
      throw error;
    }
  };

  console.log('✅ Global fetch interceptor installed');
};
