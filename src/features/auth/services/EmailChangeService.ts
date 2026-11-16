import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Challenge } from '../types';

/** Ajouter ou changer son e-mail. Une méthode par appel. */
export class EmailChangeService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/me/email` — nouvelle adresse (formulaire `auth.profile.email`).
   * Un code part vers elle ; elle n'est enregistrée qu'une fois le code validé.
   */
  start(values: FormValues): Promise<Challenge> {
    return this.client.post<Challenge>('/v1/auth/me/email', values);
  }
}

export const emailChangeService = new EmailChangeService();
