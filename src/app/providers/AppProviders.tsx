// src/app/providers/AppProviders.tsx
import React from 'react';

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    // Combine all providers here
    <>
      {children}
    </>
  );
};

export default AppProviders;
