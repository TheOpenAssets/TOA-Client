/**
 * Global error handler for API errors
 * Handles specific error cases like verification errors and 401 Unauthorized
 */

export class APIError extends Error {
  statusCode?: number;
  code?: string;

  constructor(
    message: string,
    statusCode?: number,
    code?: string
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Handle 401 Unauthorized - Logout and redirect
 */
export const handle401Unauthorized = (): void => {
  console.log('🔒 401 Unauthorized detected - Logging out user');

  // Clear all auth-related data from localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('authenticated_wallet_address');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('redirect_after_verification');

  // Disconnect wallet by triggering a page reload to reset wagmi state
  // This ensures the wallet connection is also cleared
  window.location.href = '/';
};

export const handleAPIError = (error: any): never => {
  // Check if it's a 401 Unauthorized error
  if (error.statusCode === 401 || error.status === 401) {
    handle401Unauthorized();
    throw new APIError('Unauthorized. Please login again.', 401, 'UNAUTHORIZED');
  }

  // Check if error response contains 401
  if (error.response?.status === 401) {
    handle401Unauthorized();
    throw new APIError('Unauthorized. Please login again.', 401, 'UNAUTHORIZED');
  }

  // Check if it's the verification error
  if (
    error.message?.includes('Not a verified user') ||
    error.message?.includes('solve the challenge')
  ) {
    // Clear user session/auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('redirect_after_verification');

    // Redirect to auth page
    window.location.href = '/';
    throw new APIError(error.message, 401, 'VERIFICATION_REQUIRED');
  }

  // Handle other errors
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || error.message;
    const statusCode = error.response.status;
    throw new APIError(message, statusCode);
  } else if (error.request) {
    // Request made but no response
    throw new APIError('Network error. Please check your connection.', 0);
  } else {
    // Other errors
    throw new APIError(error.message || 'An unexpected error occurred');
  }
};

/**
 * Wrapper to safely execute async functions with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    return handleAPIError(error);
  }
}
