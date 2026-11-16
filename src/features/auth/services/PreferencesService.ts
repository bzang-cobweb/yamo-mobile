import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { User, UserResponse } from '../types';

/** Une méthode par appel. */
export class PreferencesService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `PATCH /api/v1/auth/me/preferences` — langue (formulaire `auth.profile.preferences`) ; renvoie l'utilisateur modifié. */
  async update(values: FormValues): Promise<User> {
    return (await this.client.patch<UserResponse>('/v1/auth/me/preferences', values)).data;
  }
}

export const preferencesService = new PreferencesService();
