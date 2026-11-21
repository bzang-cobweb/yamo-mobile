import { router } from 'expo-router';

import { showToast } from '@/shared/components/Toast';

/**
 * Après l'envoi d'un formulaire : le message dans le bandeau flottant, qui survit au changement
 * d'écran (décision 2026-11-21-bandeau-messages), puis le retour.
 */

/** Revient au profil, en affichant `message`. */
export function backToProfile(message: string) {
  showToast(message);
  router.dismissTo('/profile');
}

/** Revient à l'écran précédent (une liste du profil, une fiche), en affichant `message`. */
export function backWithNotice(message: string) {
  showToast(message);
  router.back();
}
