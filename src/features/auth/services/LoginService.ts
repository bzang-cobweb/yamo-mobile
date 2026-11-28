import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Challenge } from '../types';

/** Connexion à l'API, première étape. Une méthode par appel. */
export class LoginService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/login` — e-mail ou téléphone (formulaire `auth.login`, ou l'identifiant mémorisé). Le code part
   * toujours, compte connu ou non (202) : l'existence du compte n'est dite qu'après le code (contrat
   * 2026-11-28-connexion-panneau).
   */
  login(values: FormValues): Promise<Challenge> {
    return this.client.post<Challenge>('/v1/auth/login', values);
  }
}

export const loginService = new LoginService();
