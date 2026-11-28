import type { FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { SessionResponse, SessionResult } from '../types';

/** L'étape du mot de passe, après le code. Une méthode par appel. */
export class SessionService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/session` — le défi vérifié et le mot de passe (formulaire `auth.session.password`), ou le
   * nouveau mot de passe et sa confirmation (`auth.session.new-password`) ; `reset` : « Mot de passe oublié ? ».
   * Réponse : connecté, ou (pas de compte) l'inscription à remplir avec le même défi.
   */
  async open(challenge: string, values: FormValues, reset: boolean, deviceName: string): Promise<SessionResult> {
    const response = await this.client.post<SessionResponse>('/v1/auth/session', {
      ...values,
      challenge,
      ...(reset ? { reset: true } : {}),
      device_name: deviceName,
    });

    if ('next' in response) {
      return { kind: 'register', challenge: response.challenge };
    }

    return { kind: 'session', session: { user: response.data, token: response.token } };
  }
}

export const sessionService = new SessionService();
