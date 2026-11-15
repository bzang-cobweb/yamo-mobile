import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { LoginCredentials, LoginResponse, User, UserResponse } from '../types';

/**
 * Session de l'utilisateur sur l'API. Une méthode par appel API ; le jeton et
 * la langue des requêtes sont portés par le client.
 */
export class AuthService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `POST /api/v1/auth/login` — renvoie l'utilisateur et le jeton de l'appareil. */
  async login(credentials: LoginCredentials, deviceName: string): Promise<{ user: User; token: string }> {
    const response = await this.client.post<LoginResponse>('/v1/auth/login', {
      ...credentials,
      device_name: deviceName,
    });

    return { user: response.data, token: response.token };
  }

  /** `POST /api/v1/auth/logout` — révoque le jeton courant. */
  logout(): Promise<void> {
    return this.client.post<void>('/v1/auth/logout');
  }

  /** `GET /api/v1/auth/me` — utilisateur connecté. */
  async me(): Promise<User> {
    return (await this.client.get<UserResponse>('/v1/auth/me')).data;
  }
}

export const authService = new AuthService();
