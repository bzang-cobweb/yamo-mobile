import { ScrollView, StyleSheet, View } from 'react-native';

import { StatusTag } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { ContactRow } from './ContactRow';
import { PartnerLoader } from './PartnerLoader';
import { PartnerLogo } from './PartnerLogo';
import type { Partner } from '../types';

const LOGO_SIZE = 120;

/**
 * Le contenu de la fiche d'un partenaire, lu par son identifiant (décision 2026-11-27-info-partenaire-en-panneau) : son
 * logo, son nom et son slogan, ses vues pour ses comptes, son e-mail et son téléphone, puis sa description (décisions
 * 2026-11-23-partenaires-liste-detail et 2026-11-24-partenaire-contact) ; sa pastille, pour ses comptes, après le slogan.
 * Pendant le chargement, une roue ; un partenaire qui n'est plus visible : « plus disponible ». La page d'un partenaire
 * et le panneau « Info » de la page d'une notification de partenaire s'en servent.
 */
export function PartnerDetails({ id }: { id: string }) {
  return <PartnerLoader id={id}>{(partner) => <PartnerDetailsBody partner={partner} />}</PartnerLoader>;
}

function PartnerDetailsBody({ partner }: { partner: Partner }) {
  const { t } = useI18n();
  const theme = useTheme();

  return (
    <View style={styles.content}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.identity}>
          {/* Sans logo, rien : le nom suffit (décision 2026-11-24-partenaire-page-sans-logo). */}
          {partner.logo && <PartnerLogo partner={partner} size={LOGO_SIZE} framed={false} testID="partner" />}
          {/* Le nom, et juste dessous son slogan s'il en a un (décision 2026-11-24-partenaire-slogan). */}
          <View style={styles.heading}>
            <ThemedText type="subtitle" accessibilityRole="header" style={styles.centered} testID="partner-name">
              {partner.name}
            </ThemedText>
            {partner.slogan && (
              <ThemedText themeColor="textSecondary" style={styles.centered} testID="partner-slogan">
                {partner.slogan}
              </ThemedText>
            )}
            {/* Sa pastille, pour ses comptes : centrée, après le slogan (sans slogan, après le nom) (décisions
                2026-11-24-partenaire-page-statut et 2026-11-27-fiche-statut-apres-slogan). */}
            {partner.status && <StatusTag tag={partner.status} style={styles.status} testID="partner-status" />}
          </View>
        </View>
        {/* Son e-mail et son téléphone ; les toucher ouvre l'e-mail ou l'appel (décision 2026-11-24-partenaire-contact). Ni vues
            ni membres : ils sont dans le menu de « Mes partenaires » (décision 2026-11-27-fiche-sans-vues-membres). */}
        {(partner.contact_email || partner.contact_phone) && (
          <View style={[styles.contact, { borderColor: theme.backgroundSelected }]} testID="partner-contact">
            {partner.contact_email && (
              <ContactRow label={t('partners.email')} value={partner.contact_email} url={`mailto:${partner.contact_email}`} testID="partner-email" />
            )}
            {partner.contact_phone && (
              <ContactRow label={t('partners.phone')} value={partner.contact_phone} url={`tel:${partner.contact_phone.replace(/\s/g, '')}`} testID="partner-phone" />
            )}
          </View>
        )}
        {/* La description après le contact (décision 2026-11-24-partenaire-contact), en gris (décision 2026-11-24-partenaire-description-grise). */}
        {partner.description && (
          <ThemedText themeColor="textSecondary" testID="partner-description">
            {partner.description}
          </ThemedText>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  // Centrée : la pastille se cale à gauche par défaut.
  status: { alignSelf: 'center' },
  body: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four, gap: Spacing.four },
  identity: { alignItems: 'center', gap: Spacing.three },
  centered: { textAlign: 'center' },
  heading: { gap: Spacing.half },
  contact: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: Spacing.three, gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.three },
});
