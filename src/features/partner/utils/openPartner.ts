import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { partnerService } from '../services/PartnerService';
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
 * Un partenaire touché dans le carrousel de l'accueil ou la page « Partenaires » : un clic de plus, puis sa fiche
 * (décision 2026-11-25-compteurs-partenaires). L'API ne le compte pas pour ses propres comptes ; une erreur réseau ne
 * bloque pas l'ouverture.
 */
export function openPartnerDetail(id: string) {
  void partnerService.click(id).catch(() => undefined);
  router.push({ pathname: '/partners/[id]', params: { id } });
}
