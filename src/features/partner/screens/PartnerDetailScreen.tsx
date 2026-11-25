import { useEffect } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, NetworkError } from '@/shared/api/errors';
import { BackHeader } from '@/shared/components/BackHeader';
import { FixedButtonBar } from '@/shared/components/FixedButtonBar';
import { StatusTag } from '@/shared/components/StatusTag';
import { ViewsCount } from '@/shared/components/ViewsCount';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { PartnerLogo } from '../components/PartnerLogo';
import { usePartner } from '../hooks/usePartners';
import { partnerService } from '../services/PartnerService';
import { openPartner } from '../utils/openPartner';

const LOGO_SIZE = 120;

/**
 * La page d'un partenaire (décision 2026-11-23-partenaires-liste-detail) : son logo, son nom, son e-mail et son
 * téléphone, puis sa description (décision 2026-11-24-partenaire-contact) ; en
 * bas, son bouton (son libellé, sinon « Visiter le site »), qui compte un clic et ouvre son lien. Sans lien, pas de
 * bouton. Un partenaire qui n'est plus visible : « plus disponible ».
 */
export function PartnerDetailScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const theme = useTheme();
  const query = usePartner(id);
  // Ouvrir sa page, par n'importe quel lien, compte un clic ; l'API ne le compte pas pour ses comptes (décision
  // 2026-11-25-clic-a-l-ouverture). Une fois par ouverture ; une erreur réseau ne gêne pas la page.
  useEffect(() => {
    void partnerService.click(id).catch(() => undefined);
  }, [id]);
  const partner = query.data;
  const gone = query.error instanceof ApiError && query.error.status === 404;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={partner?.name ?? t('partners.title')} />
          {query.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator testID="partner-loading" />
            </View>
          ) : query.isError || !partner ? (
            <View style={styles.center}>
              <ThemedText themeColor="textSecondary" testID="partner-error">
                {gone ? t('partners.unavailable') : query.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}
              </ThemedText>
              {!gone && (
                <Pressable accessibilityRole="button" testID="partner-retry" onPress={() => query.refetch()}>
                  <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
                </Pressable>
              )}
            </View>
          ) : (
            <>
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
                      {/* Ses vues, pour ses comptes seulement : un œil et le nombre, après le slogan (décisions
                          2026-11-25-partenaire-vues-sur-sa-page et 2026-11-25-vues-oeil). */}
                      {partner.views && <ViewsCount views={partner.views} style={styles.views} testID="partner-views" />}
                    </View>
                  </View>
                  {/* Son e-mail et son téléphone ; les toucher ouvre l'e-mail ou l'appel (décision 2026-11-24-partenaire-contact). */}
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
                {/* Sa pastille, pour ses comptes : en haut à droite, flottante sur la zone de contenu, qui défile dessous
                    (décision 2026-11-24-partenaire-page-statut). */}
                {partner.status && <StatusTag tag={partner.status} style={styles.status} testID="partner-status" />}
              </View>
              {partner.website && <FixedButtonBar testID="partner-cta" label={partner.cta_label ?? t('partners.visit')} onPress={() => openPartner(partner)} />}
            </>
          )}
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Une ligne de contact : le libellé à gauche, la valeur en lien à droite. */
function ContactRow({ label, value, url, testID }: { label: string; value: string; url: string; testID: string }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
      <Pressable accessibilityRole="link" accessibilityLabel={`${label} ${value}`} hitSlop={Spacing.one} onPress={() => void Linking.openURL(url)} testID={testID}>
        <ThemedText style={{ color: theme.primary }}>{value}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  views: { alignSelf: 'center' },
  status: { position: 'absolute', top: Spacing.three, right: Spacing.three, zIndex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  body: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four, gap: Spacing.four },
  identity: { alignItems: 'center', gap: Spacing.three },
  centered: { textAlign: 'center' },
  heading: { gap: Spacing.half },
  contact: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: Spacing.three, gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.three },
});
