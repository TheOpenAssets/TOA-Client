// src/hooks/usePermissions.ts
// Example hook for role-based permissions
export const usePermissions = (userRole: string) => {
  const checkPermission = (allowedRoles: string[]) => {
    return allowedRoles.includes(userRole);
  };

  return { checkPermission };
};
