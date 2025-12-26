
// src/lib/api/base.service.ts
class BaseService {
  protected baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  protected getHeaders = () => {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };

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

