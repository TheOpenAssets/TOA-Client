
// src/lib/api/base.service.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f5e22b62e871.ngrok-free.app';

class BaseService {
  protected baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  protected getHeaders = () => {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
    };

    if (this.baseURL.includes('ngrok-free.app')) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    return headers;
  }

  protected getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found');
    }
    return {
      ...this.getHeaders(),
      'Authorization': `Bearer ${token}`,
    };
  }
}

export default BaseService;
