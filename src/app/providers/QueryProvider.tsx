// src/app/providers/QueryProvider.tsx
import React from 'react';
// You would typically use a library like React Query
// import { QueryClient, QueryClientProvider } from 'react-query';

// const queryClient = new QueryClient();

const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    // <QueryClientProvider client={queryClient}>
    //   {children}
    // </QueryClientProvider>
    <>{children}</>
  );
};

export default QueryProvider;
