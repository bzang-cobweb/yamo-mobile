import { apiClient, type ApiClient } from '@/shared/api/ApiClient';
import { appendFile, formFileFromBase64 } from '@/shared/api/form-file';

import type { AvatarFile, User, UserResponse } from '../types';

/**
 * Profil de l'utilisateur connecté : consultation, photo et langue. Une méthode par appel.
 * Les formulaires du profil sont envoyés par `ProfileFormService`, selon leur
 * définition servie par l'API.
 */
export class ProfileService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/auth/me` — utilisateur connecté. */
  async get(): Promise<User> {
    return (await this.client.get<UserResponse>('/v1/auth/me')).data;
  }

  /**
   * `POST /api/v1/auth/me/avatar` — remplace sa photo de profil (multipart,
   * champ `avatar`) ; renvoie l'utilisateur modifié.
   */
  async uploadAvatar(file: AvatarFile): Promise<User> {
    const form = new FormData();
    appendFile(form, 'avatar', formFileFromBase64(file.name, file.type, file.base64));

    return (await this.client.postForm<UserResponse>('/v1/auth/me/avatar', form)).data;
  }

  /**
   * `PATCH /api/v1/auth/me/preferences` — change la langue du compte (sélecteur
   * de la barre du haut) ; renvoie l'utilisateur modifié.
   */
  async updateLocale(locale: string): Promise<User> {
    return (await this.client.patch<UserResponse>('/v1/auth/me/preferences', { locale })).data;
  }

  /** `DELETE /api/v1/auth/me/avatar` — retire sa photo de profil. */
  async removeAvatar(): Promise<User> {
    return (await this.client.delete<UserResponse>('/v1/auth/me/avatar')).data;
  }
}

export const profileService = new ProfileService();
