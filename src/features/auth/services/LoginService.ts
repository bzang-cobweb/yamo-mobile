import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Challenge } from '../types';

/** Connexion à l'API, première étape. Une méthode par appel. */
export class LoginService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/login` — e-mail ou téléphone et mot de passe (formulaire
   * `auth.login`). Un code part vers cet e-mail ou ce téléphone ; le jeton n'est
   * rendu qu'une fois le code validé (`VerificationService.verify`).
   */
  login(values: FormValues): Promise<Challenge> {
    return this.client.post<Challenge>('/v1/auth/login', values);
  }
}

export const loginService = new LoginService();
