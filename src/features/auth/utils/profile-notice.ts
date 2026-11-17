import { router } from 'expo-router';

/**
 * Confirmation à afficher au retour sur le profil. Gardée en mémoire plutôt que
 * dans l'URL : un lien venu d'ailleurs ne peut pas y faire écrire un texte.
 */
let pending: string | null = null;

/** Revient au profil, qui affiche `message`. */
export function backToProfile(message: string) {
  pending = message;
  router.dismissTo('/profile');
}

/** Revient à l'écran précédent (une liste du profil), qui affiche `message`. */
export function backWithNotice(message: string) {
  pending = message;
  router.back();
}

/** La confirmation en attente, une seule fois, pour l'écran qui reprend la main. */
export function takeProfileNotice(): string | null {
  const message = pending;
  pending = null;

  return message;
}
