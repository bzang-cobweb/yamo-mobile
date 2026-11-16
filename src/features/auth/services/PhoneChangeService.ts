import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Challenge } from '../types';

/** Ajouter ou changer son téléphone. Une méthode par appel. */
export class PhoneChangeService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/me/phone` — nouveau numéro et son pays (formulaire
   * `auth.profile.phone`). Un code part par SMS ; le numéro n'est enregistré qu'une
   * fois le code validé.
   */
  start(values: FormValues): Promise<Challenge> {
    return this.client.post<Challenge>('/v1/auth/me/phone', values);
  }
}

export const phoneChangeService = new PhoneChangeService();
