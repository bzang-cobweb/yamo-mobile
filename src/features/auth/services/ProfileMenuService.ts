import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { ProfileMenuItem, ProfileSubMenu } from '../types';

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

  /**
   * `GET /api/v1/auth/me/menu/{menu}` — un sous-menu (« Informations personnelles », « Confidentialité ») : son
   * titre et ses liens (décision 2026-11-27-menu-profil-icones-sous-menus).
   */
  submenu(menu: string): Promise<ProfileSubMenu> {
    return this.client.get<ProfileSubMenu>(`/v1/auth/me/menu/${encodeURIComponent(menu)}`);
  }
}

export const profileMenuService = new ProfileMenuService();
