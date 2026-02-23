import { QueryClient } from '@tanstack/react-query';

// Create a single QueryClient instance with proper configuration
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
