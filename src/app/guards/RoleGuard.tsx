// src/app/guards/RoleGuard.tsx
import React from 'react';

type Role = 'investor' | 'issuer' | 'admin';

const RoleGuard: React.FC<{ children: React.ReactNode; allowedRoles: Role[] }> = ({ children, allowedRoles }) => {
  // Add role-based access logic here
  const userRole: Role = 'admin'; // Placeholder

  if (!allowedRoles.includes(userRole)) {
    return <div>You do not have permission to view this page</div>;
  }

  return <>{children}</>;
};

export default RoleGuard;
