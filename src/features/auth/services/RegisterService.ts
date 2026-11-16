import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Challenge } from '../types';

/** Créer un compte. Une méthode par appel. */
export class RegisterService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/register` — champs du formulaire `auth.register`. Un code part
   * vers l'e-mail et/ou le téléphone ; le compte naît quand tous sont validés.
   */
  register(values: FormValues): Promise<Challenge> {
    return this.client.post<Challenge>('/v1/auth/register', values);
  }
}

export const registerService = new RegisterService();
