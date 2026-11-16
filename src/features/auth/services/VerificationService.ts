import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Challenge, VerifyResponse, VerifyResult } from '../types';

/** Codes de vérification (formulaire `auth.code`). Une méthode par appel. */
export class VerificationService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/codes/verify` — valide le code attendu du défi. Selon
   * l'opération : un autre code attendu, une session ouverte, ou le compte modifié.
   */
  async verify(challenge: Challenge, code: string, deviceName: string): Promise<VerifyResult> {
    const response = await this.client.post<VerifyResponse>('/v1/auth/codes/verify', {
      challenge: challenge.challenge,
      channel: challenge.channel,
      code,
      device_name: deviceName,
    });

    if ('challenge' in response) {
      return { kind: 'pending', challenge: response };
    }

    if ('token' in response) {
      return { kind: 'session', session: { user: response.data, token: response.token } };
    }

    return { kind: 'user', user: response.data };
  }

  /** `POST /api/v1/auth/codes/resend` — renvoie les codes attendus (une minute après le dernier envoi). */
  async resend(challenge: Challenge): Promise<void> {
    await this.client.post<void>('/v1/auth/codes/resend', { challenge: challenge.challenge });
  }
}

export const verificationService = new VerificationService();
