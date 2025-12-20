// src/hooks/useAuth.ts
import { useAuthStore } from '../stores/auth.store';

export const useAuth = () => {
  const { isAuthenticated, login, logout } = useAuthStore();
  return { isAuthenticated, login, logout };
};
