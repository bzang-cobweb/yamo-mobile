import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ApiError, NetworkError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { usePartner } from '../hooks/usePartners';
import type { Partner } from '../types';

/**
 * Lit le partenaire `id` et rend `children` avec lui ; pendant le chargement, une roue ; un partenaire qui n'est plus
 * visible : « plus disponible » ; une autre erreur : son message et « Réessayer ». La fiche et les membres d'un
 * partenaire s'en servent (décision 2026-11-27-partenaire-membres).
 */
export function PartnerLoader({ id, children }: { id: string; children: (partner: Partner) => ReactNode }) {
  const { t } = useI18n();
  const query = usePartner(id);
  const partner = query.data;
  const gone = query.error instanceof ApiError && query.error.status === 404;

  if (query.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="partner-loading" />
      </View>
    );
  }

  if (query.isError || !partner) {
    return (
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
    );
  }

  return <>{children(partner)}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
});
