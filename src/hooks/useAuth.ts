// src/hooks/useAuth.ts
import { useAuthStore } from '../stores/auth.store';

export const useAuth = () => {
  const { isAuthenticated, logout } = useAuthStore();
  return { isAuthenticated, logout };
};
