/**
 * Global error handler for API errors
 * Handles specific error cases like verification errors
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

export const handleAPIError = (error: any): never => {
  // Check if it's the verification error
  if (
    error.message?.includes('Not a verified user') ||
    error.message?.includes('solve the challenge')
  ) {
    // Store the current path to redirect back after verification
    const currentPath = window.location.pathname;
    if (currentPath !== '/verify-challenge' && currentPath !== '/auth') {
      localStorage.setItem('redirect_after_verification', currentPath);
    }

    // Redirect to verification page
    window.location.href = '/verify-challenge';
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
