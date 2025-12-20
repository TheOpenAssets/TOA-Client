// src/app/guards/AuthGuard.tsx
import React from 'react';

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Add authentication logic here
  const isAuthenticated = true; // Placeholder

  if (!isAuthenticated) {
    // Redirect to login page or show an error
    return <div>Access Denied</div>;
  }

  return <>{children}</>;
};

export default AuthGuard;
