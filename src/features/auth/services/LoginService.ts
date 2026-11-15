import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { LoginCredentials, LoginResponse, User } from '../types';

/** Connexion à l'API. Une méthode par appel. */
export class LoginService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/login` — champs du formulaire `auth.login` et nom de
   * l'appareil ; renvoie l'utilisateur et le jeton de l'appareil.
   */
  async login(credentials: LoginCredentials, deviceName: string): Promise<{ user: User; token: string }> {
    const response = await this.client.post<LoginResponse>('/v1/auth/login', {
      ...credentials,
      device_name: deviceName,
    });

    return { user: response.data, token: response.token };
  }
}

export const loginService = new LoginService();
