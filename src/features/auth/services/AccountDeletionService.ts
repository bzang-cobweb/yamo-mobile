import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

/** Une méthode par appel. */
export class AccountDeletionService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `DELETE /api/v1/auth/me` — mot de passe actuel (formulaire
   * `auth.profile.delete-account`). Le compte est désactivé, tous ses appareils
   * déconnectés ; il est purgé après le délai réglé côté serveur.
   */
  async delete(values: FormValues): Promise<void> {
    await this.client.delete<void>('/v1/auth/me', values);
  }
}

export const accountDeletionService = new AccountDeletionService();
