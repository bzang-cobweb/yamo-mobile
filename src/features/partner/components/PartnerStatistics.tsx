import { ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { PartnerLoader } from './PartnerLoader';
import type { Partner, PartnerCount } from '../types';

/**
 * Les statistiques d'un partenaire, pour ses comptes (décision 2026-11-27-fiche-statistiques) : le nombre de ses vues et de
 * ses clics, une ligne chacun, le libellé à gauche et le nombre à droite. Le panneau « Statistiques » de sa fiche et de
 * « Mes partenaires ».
 */
export function PartnerStatistics({ partner }: { partner: Partner }) {
  const { t } = useI18n();
  const theme = useTheme();
  const rows: { key: string; label: string; value: PartnerCount | null }[] = [
    { key: 'views', label: t('partners.views'), value: countOf(partner.views) },
    { key: 'clicks', label: t('partners.clicks'), value: countOf(partner.clicks) },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.body} testID="partner-statistics">
      {rows.map((row) =>
        row.value ? (
          <View key={row.key} style={[styles.row, { borderBottomColor: theme.backgroundSelected }]} testID={`partner-statistics-${row.key}`}>
            <ThemedText themeColor="textSecondary">{row.label}</ThemedText>
            <ThemedText type="smallBold" accessibilityLabel={row.value.label} testID={`partner-statistics-${row.key}-count`}>
              {row.value.count}
            </ThemedText>
          </View>
        ) : null,
      )}
    </ScrollView>
  );
}

/** Les statistiques du partenaire `id`, lu d'abord : le panneau « Statistiques » de « Mes partenaires ». */
export function PartnerStatisticsPanel({ id }: { id: string }) {
  return <PartnerLoader id={id}>{(partner) => <PartnerStatistics partner={partner} />}</PartnerLoader>;
}

/** Un nombre servi `{count, label}` ; une autre forme (une ancienne réponse gardée en cache) : rien. */
export function countOf(value: unknown): PartnerCount | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const count = (value as PartnerCount).count;

  return typeof count === 'number' ? (value as PartnerCount) : null;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  body: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.three, paddingBottom: Spacing.three, borderBottomWidth: 1 },
});
