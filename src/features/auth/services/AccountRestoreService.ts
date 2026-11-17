import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Session, User } from '../types';

/** Une méthode par appel. */
export class AccountRestoreService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/account/restore` — récupère le compte en attente de
   * suppression dont le code de connexion vient d'être validé ; ouvre la session.
   */
  async restore(challenge: string, deviceName: string): Promise<Session> {
    const response = await this.client.post<{ data: User; token: string }>('/v1/auth/account/restore', {
      challenge,
      device_name: deviceName,
    });

    return { user: response.data, token: response.token };
  }
}

export const accountRestoreService = new AccountRestoreService();
