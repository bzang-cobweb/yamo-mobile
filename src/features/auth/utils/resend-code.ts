import { showToast } from '@/shared/components/Toast';
import type { Translate } from '@/shared/i18n/messages';

import { verificationService } from '../services/VerificationService';
import type { Challenge } from '../types';
import { errorMessage } from './error-message';

/**
 * Renvoie les codes attendus du défi, le message dans le bandeau flottant (décision 2026-11-21-bandeau-messages) :
 * « Nouveau code envoyé », ou le refus de l'API (trop tôt, défi expiré…), sinon le message général.
 */
export async function resendCode(challenge: Challenge, t: Translate): Promise<void> {
  try {
    await verificationService.resend(challenge);
    showToast(t('auth.resent'));
  } catch (error) {
    showToast(errorMessage(error, t), 'danger');
  }
}
