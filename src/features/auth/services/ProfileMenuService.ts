import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { ProfileMenuItem } from '../types';

/** Menu du profil, défini par le serveur. Une méthode par appel. */
export class ProfileMenuService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `GET /api/v1/auth/me/menu` — liens actifs, dans l'ordre, sans ceux d'un canal
   * désactivé ; libellés dans la langue du compte.
   */
  async list(): Promise<ProfileMenuItem[]> {
    return (await this.client.get<{ data: ProfileMenuItem[] }>('/v1/auth/me/menu')).data;
  }
}

export const profileMenuService = new ProfileMenuService();
