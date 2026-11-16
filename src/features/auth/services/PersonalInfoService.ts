import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { User, UserResponse } from '../types';

/** Une méthode par appel. */
export class PersonalInfoService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `PATCH /api/v1/auth/me/personal-info` — prénom et nom (formulaire `auth.profile.personal`) ; renvoie l'utilisateur modifié. */
  async update(values: FormValues): Promise<User> {
    return (await this.client.patch<UserResponse>('/v1/auth/me/personal-info', values)).data;
  }
}

export const personalInfoService = new PersonalInfoService();
