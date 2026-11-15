import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { User, UserResponse } from '../types';

/** Profil de l'utilisateur connecté. Une méthode par appel. */
export class ProfileService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/auth/me` — utilisateur connecté. */
  async get(): Promise<User> {
    return (await this.client.get<UserResponse>('/v1/auth/me')).data;
  }

  /**
   * `PATCH /api/v1/auth/me` — champs des formulaires de profil (aujourd'hui :
   * `auth.profile.locale`) ; renvoie l'utilisateur modifié.
   */
  async update(values: Record<string, unknown>): Promise<User> {
    return (await this.client.patch<UserResponse>('/v1/auth/me', values)).data;
  }
}

export const profileService = new ProfileService();
