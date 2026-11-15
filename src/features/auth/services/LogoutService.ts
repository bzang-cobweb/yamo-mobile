import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

/** Déconnexion de l'API. Une méthode par appel. */
export class LogoutService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `POST /api/v1/auth/logout` — révoque le jeton courant (porté par le client). */
  logout(): Promise<void> {
    return this.client.post<void>('/v1/auth/logout');
  }
}

export const logoutService = new LogoutService();
