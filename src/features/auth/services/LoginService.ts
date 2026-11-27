import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { LoginResponse } from '../types';

/** Connexion à l'API, première étape. Une méthode par appel. */
export class LoginService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/login` — e-mail ou téléphone, sans mot de passe (formulaire `auth.login`). Compte trouvé : un
   * code part vers cet e-mail ou ce téléphone, le jeton n'est rendu qu'une fois le code validé
   * (`VerificationService.verify`). Sinon : `next: register` et l'identifiant saisi.
   */
  login(values: FormValues): Promise<LoginResponse> {
    return this.client.post<LoginResponse>('/v1/auth/login', values);
  }
}

export const loginService = new LoginService();
