import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Challenge, VerifyResponse, VerifyResult } from '../types';

/** Codes de vérification (formulaire `auth.code`). Une méthode par appel. */
export class VerificationService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `POST /api/v1/auth/codes/verify` — valide le code attendu du défi. Selon
   * l'opération : un autre code attendu, une session ouverte, le compte modifié,
   * (mot de passe oublié) le choix du nouveau mot de passe, ou (compte en attente de
   * suppression) la proposition de le récupérer.
   */
  async verify(challenge: Challenge, code: string, deviceName: string): Promise<VerifyResult> {
    const response = await this.client.post<VerifyResponse>('/v1/auth/codes/verify', {
      challenge: challenge.challenge,
      channel: challenge.channel,
      code,
      device_name: deviceName,
    });

    if ('next' in response) {
      return response.next === 'restore'
        ? { kind: 'restore', challenge: response.challenge, deletionDate: response.deletion_date_text ?? response.deletion_date }
        : { kind: 'password', challenge: response.challenge };
    }

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
