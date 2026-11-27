import type { ReactElement } from 'react';

import { PartnerMembers } from '@/features/partner/components/PartnerMembers';
import { PartnerStatisticsPanel } from '@/features/partner/components/PartnerStatistics';

/**
 * Les panneaux qu'une action de carte peut ouvrir, par leur nom servi (décision 2026-11-27-action-panneau) : chacun reçoit
 * l'enregistrement montré. Un nom inconnu de cette version de l'app : rien.
 */
const PANELS: Record<string, (record: string) => ReactElement> = {
  'partner.members': (record) => <PartnerMembers id={record} />,
  'partner.statistics': (record) => <PartnerStatisticsPanel id={record} />,
};

/** Le contenu du panneau `name`, pour l'enregistrement `record` ; `null` pour un nom inconnu. */
export function ActionPanel({ name, record }: { name: string; record: string }) {
  const panel = PANELS[name];

  return panel ? panel(record) : null;
}

/** L'app sait-elle ouvrir ce panneau ? */
export function knowsPanel(name: string): boolean {
  return name in PANELS;
}
