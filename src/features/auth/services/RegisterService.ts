import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Session, User } from '../types';

/** Créer un compte. Une méthode par appel. */
export class RegisterService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/register` — le défi vérifié (code puis mot de passe) et les champs du formulaire
   * `auth.register` (prénom, nom, l'autre contact facultatif). Le compte naît, la session s'ouvre (201).
   */
  async register(challenge: string, values: FormValues, deviceName: string): Promise<Session> {
    const response = await this.client.post<{ data: User; token: string }>('/v1/auth/register', { ...values, challenge, device_name: deviceName });

    return { user: response.data, token: response.token };
  }
}

export const registerService = new RegisterService();
