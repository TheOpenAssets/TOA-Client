// src/types/api.types.ts
// Example API types
export interface ApiResponse<T> {
  data: T;
  error: string | null;
}
