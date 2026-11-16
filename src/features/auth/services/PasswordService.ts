import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

/** Une méthode par appel. */
export class PasswordService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `PUT /api/v1/auth/me/password` — ancien, nouveau mot de passe et confirmation (formulaire `auth.profile.password`). Les autres appareils sont déconnectés ; celui-ci reste connecté. */
  async update(values: FormValues): Promise<void> {
    await this.client.put<void>('/v1/auth/me/password', values);
  }
}

export const passwordService = new PasswordService();
