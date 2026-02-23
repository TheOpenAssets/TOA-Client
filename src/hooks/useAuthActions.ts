import { useAuthStrategy } from "../lib/auth/AuthStrategyContext";

export const useAuthActions = () => {
  return useAuthStrategy();
};

