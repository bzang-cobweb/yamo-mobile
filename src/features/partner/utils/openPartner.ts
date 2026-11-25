import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import type { Partner } from '../types';

/**
 * Le bouton d'un partenaire : son lien dans le navigateur de l'app (décisions 2026-11-23-module-partenaires et
 * 2026-11-23-partenaires-liste-detail). Il ne compte pas de clic (décision 2026-11-25-compteurs-partenaires).
 */
export function openPartner(partner: Pick<Partner, 'website'>) {
  if (partner.website) {
    void WebBrowser.openBrowserAsync(partner.website);
  }
}

/**
 * Un partenaire touché dans le carrousel de l'accueil ou la page « Partenaires » : sa page, qui compte le clic
 * (décision 2026-11-25-clic-a-l-ouverture).
 */
export function openPartnerDetail(id: string) {
  router.push({ pathname: '/partners/[id]', params: { id } });
}
