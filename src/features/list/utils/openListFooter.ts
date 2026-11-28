import { router, type Href } from 'expo-router';

import { openAuthSheet } from '@/features/auth/components/AuthSheet';

import { ITEM_LINK } from '../services/ListService';

/**
 * Le bouton de la barre fixe en bas d'une liste, décrit par l'API (`footer`) : son formulaire, ou un écran de l'app
 * — l'accueil `/`, la recherche `/search`, la connexion `/sign-in` (son panneau) (« Devenir partenaire » pour un visiteur,
 * décision 2026-11-24-devenir-partenaire), une fiche ; jamais une adresse externe. Le même partout.
 */
export function openListFooter(footer: { form: string | null; link: string | null }) {
  if (footer.form) {
    router.push({ pathname: '/profile/[form]', params: { form: footer.form } });
  } else if (footer.link === '/' || footer.link === '/search') {
    // Un onglet : l'accueil, ou la recherche des offres (décision 2026-11-23-onglet-recherche).
    router.navigate(footer.link);
  } else if (footer.link === '/sign-in') {
    // Le lien servi de la connexion ouvre son panneau (décision 2026-11-28-app-connexion-panneau).
    openAuthSheet();
  } else if (footer.link && ITEM_LINK.test(footer.link)) {
    router.push(footer.link as Href);
  }
}
