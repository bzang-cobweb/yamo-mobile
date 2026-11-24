import * as WebBrowser from 'expo-web-browser';

import { partnerService } from '../services/PartnerService';
import type { Partner } from '../types';

/**
 * Le bouton d'un partenaire : un clic de plus, puis son lien dans le navigateur de l'app (décisions
 * 2026-11-23-module-partenaires et 2026-11-23-partenaires-liste-detail). Le clic compte même si le lien ne s'ouvre
 * pas ; une erreur réseau ne bloque pas l'ouverture.
 */
export function openPartner(partner: Pick<Partner, 'id' | 'website'>) {
  void partnerService.click(partner.id).catch(() => undefined);
  if (partner.website) {
    void WebBrowser.openBrowserAsync(partner.website);
  }
}
