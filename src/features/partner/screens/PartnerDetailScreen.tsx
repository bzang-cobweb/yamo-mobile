import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, NetworkError } from '@/shared/api/errors';
import { BackHeader } from '@/shared/components/BackHeader';
import { FixedButtonBar } from '@/shared/components/FixedButtonBar';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { PartnerLogo } from '../components/PartnerLogo';
import { usePartner } from '../hooks/usePartners';
import { openPartner } from '../utils/openPartner';

const LOGO_SIZE = 120;

/**
 * La page d'un partenaire (décision 2026-11-23-partenaires-liste-detail) : son logo, son nom, sa description ; en
 * bas, son bouton (son libellé, sinon « Visiter le site »), qui compte un clic et ouvre son lien. Sans lien, pas de
 * bouton. Un partenaire qui n'est plus visible : « plus disponible ».
 */
export function PartnerDetailScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const query = usePartner(id);
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
              <ScrollView contentContainerStyle={styles.body}>
                <View style={styles.identity}>
                  <PartnerLogo partner={partner} size={LOGO_SIZE} testID="partner" />
                  <ThemedText type="subtitle" accessibilityRole="header" style={styles.centered} testID="partner-name">
                    {partner.name}
                  </ThemedText>
                </View>
                {partner.description && <ThemedText testID="partner-description">{partner.description}</ThemedText>}
              </ScrollView>
              {partner.url && <FixedButtonBar testID="partner-cta" label={partner.cta_label ?? t('partners.visit')} onPress={() => openPartner(partner)} />}
            </>
          )}
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  body: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four, gap: Spacing.four },
  identity: { alignItems: 'center', gap: Spacing.three },
  centered: { textAlign: 'center' },
});
