// src/app/guards/KycGuard.tsx
import React from 'react';

const KycGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Add KYC/compliance logic here
  const isKycVerified = true; // Placeholder

  if (!isKycVerified) {
    return <div>KYC verification required</div>;
  }

  return <>{children}</>;
};

export default KycGuard;
