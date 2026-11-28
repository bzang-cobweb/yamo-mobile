import { ApiError, NetworkError } from '@/shared/api/errors';
import type { Translate } from '@/shared/i18n/messages';

/** Le message d'une demande refusée : celui de l'API (trop tôt, défi expiré…), l'absence de réseau, sinon le message général. */
export function errorMessage(error: unknown, t: Translate): string {
  if (error instanceof ApiError) {
    return Object.values(error.errors)[0]?.[0] ?? error.message;
  }

  return error instanceof NetworkError ? t('offline.message') : t('error.unknown');
}
