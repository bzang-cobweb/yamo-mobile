import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Challenge } from '../types';

/** Mot de passe oublié. Une méthode par appel. */
export class PasswordResetService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/password/forgot` — e-mail ou téléphone (formulaire
   * `auth.password.forgot`). La réponse est la même qu'un compte existe ou non.
   */
  forgot(values: FormValues): Promise<Challenge> {
    return this.client.post<Challenge>('/v1/auth/password/forgot', values);
  }

  /**
   * `POST /api/v1/auth/password/reset` — nouveau mot de passe et confirmation
   * (formulaire `auth.password.reset`), pour un défi dont le code a été validé.
   * Toutes les sessions sont fermées.
   */
  async reset(challenge: string, values: FormValues): Promise<void> {
    await this.client.post<void>('/v1/auth/password/reset', { ...values, challenge });
  }
}

export const passwordResetService = new PasswordResetService();
