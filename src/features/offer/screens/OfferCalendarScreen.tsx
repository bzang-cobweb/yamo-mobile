import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { ItemActionButtons } from '@/features/list/components/ItemActionButtons';
import { useItemActions } from '@/features/list/hooks/useItemActions';
import type { ListItem } from '@/features/list/types';
import { NetworkError } from '@/shared/api/errors';
import { BackHeader } from '@/shared/components/BackHeader';
import { MonthGrid } from '@/shared/components/MonthGrid';
import { Quote } from '@/shared/components/Quote';
import { StatusTag, TONE_COLORS } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useOfferCalendar, useOfferCalendarDay } from '../hooks/useOfferCalendar';

/** La couleur d'une case de la légende, comme dans la grille. */
const LEGEND_COLORS: Record<string, string> = {
  accepted: TONE_COLORS.success,
  pending: TONE_COLORS.warning,
  conflict: TONE_COLORS.warning,
  blocked: TONE_COLORS.neutral,
};

/**
 * Le calendrier d'une offre, pour son propriétaire (décision
 * 2026-11-19-contrat-calendrier-offre) : un mois en grille (flèches ou glissement),
 * la légende, et, en touchant un jour, un panneau en bas avec ses demandes (Accepter,
 * Refuser) et « Bloquer ce jour » ou « Débloquer ». Tout est décrit par l'API.
 */
export function OfferCalendarScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const calendar = useOfferCalendar(id, month);
  const day = useOfferCalendarDay(id, selected);
  const data = calendar.data;

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['offer-calendar', id] }),
      queryClient.invalidateQueries({ queryKey: ['offer-calendar-day', id] }),
    ]);
  }

  const { press } = useItemActions({ onNotice: setNotice, onError: setError, onDone: refresh });

  // Un autre écran s'ouvre par-dessus : le panneau (une fenêtre native) se ferme ; au
  // retour, le mois se recharge (une demande a pu changer ailleurs).
  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['offer-calendar', id] });

      return () => setSelected(null);
    }, [queryClient, id]),
  );

  function open(date: string) {
    setNotice(null);
    setError(null);
    setSelected(date);
  }

  function renderCard(item: ListItem) {
    return (
      <View key={item.id} style={[styles.card, { borderColor: theme.backgroundSelected }]} testID={`calendar-item-${item.id}`}>
        {item.tag && <StatusTag tag={item.tag} />}
        <ThemedText>{item.title}</ThemedText>
        {item.subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {item.subtitle}
          </ThemedText>
        )}
        {item.quote && <Quote text={item.quote} />}
        {item.highlight && <ThemedText type="smallBold">{item.highlight}</ThemedText>}
        <ItemActionButtons actions={item.actions ?? []} testID={`calendar-action-${item.id}`} onPress={press} />
      </View>
    );
  }

  const panel = day.data;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={data?.title ?? ''} />
          {calendar.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator testID="offer-calendar-loading" />
            </View>
          ) : calendar.isError || !data ? (
            <View style={styles.center}>
              <ThemedText style={styles.error} accessibilityRole="alert" testID="offer-calendar-error">
                {calendar.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}
              </ThemedText>
              <Pressable accessibilityRole="button" testID="offer-calendar-retry" onPress={() => calendar.refetch()}>
                <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={[styles.body, { maxWidth: MaxContentWidth / 2 }]}>
              <MonthGrid
                testID="offer-calendar"
                label={data.label}
                weekdays={data.weekdays}
                offset={data.offset}
                cells={data.days}
                onPress={open}
                onPrevious={data.previous ? () => setMonth(data.previous) : null}
                onNext={data.next ? () => setMonth(data.next) : null}
                previousLabel={t('form.previousMonth')}
                nextLabel={t('form.nextMonth')}
              />
              <View style={styles.legend} testID="offer-calendar-legend">
                {data.legend.map((entry) => (
                  <View key={`${entry.kind}-${entry.tone}`} style={styles.legendRow}>
                    {entry.kind === 'dot' ? (
                      <View style={[styles.legendDot, { backgroundColor: TONE_COLORS[entry.tone] ?? TONE_COLORS.neutral }]} />
                    ) : (
                      <View
                        style={[
                          styles.legendBox,
                          { backgroundColor: LEGEND_COLORS[entry.tone] ?? TONE_COLORS.neutral },
                          entry.tone === 'conflict' && { borderWidth: 2, borderColor: TONE_COLORS.danger },
                        ]}
                      />
                    )}
                    <ThemedText type="small">{entry.label}</ThemedText>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
            <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel={t('form.closeCalendar')} onPress={() => setSelected(null)} />
            <ThemedView style={styles.sheet} testID="offer-calendar-day">
              <View style={styles.sheetHeader}>
                <ThemedText type="smallBold" style={styles.sheetTitle} accessibilityRole="header">
                  {panel?.title ?? ''}
                </ThemedText>
                <Pressable testID="offer-calendar-day-close" accessibilityRole="button" hitSlop={Spacing.two} onPress={() => setSelected(null)}>
                  <ThemedText type="linkPrimary">{t('form.closeCalendar')}</ThemedText>
                </Pressable>
              </View>
              {notice && (
                <ThemedText type="small" themeColor="textSecondary" testID="offer-calendar-notice">
                  {notice}
                </ThemedText>
              )}
              {error && (
                <ThemedText type="small" style={styles.error} accessibilityRole="alert" testID="offer-calendar-day-error">
                  {error}
                </ThemedText>
              )}
              {day.isPending || !panel ? (
                <ActivityIndicator style={styles.sheetLoading} />
              ) : (
                <ScrollView contentContainerStyle={styles.sheetBody}>
                  {panel.items.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary" testID="offer-calendar-day-empty">
                      {panel.empty}
                    </ThemedText>
                  ) : (
                    panel.items.map(renderCard)
                  )}
                  {panel.note && (
                    <ThemedText type="small" themeColor="textSecondary" testID="offer-calendar-day-note">
                      {panel.note}
                    </ThemedText>
                  )}
                  {panel.action && <ItemActionButtons actions={[panel.action]} testID="offer-calendar-day-action" onPress={press} />}
                </ScrollView>
              )}
            </ThemedView>
          </Modal>
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  error: { color: ERROR_COLOR },
  body: { width: '100%', alignSelf: 'center', padding: Spacing.four, gap: Spacing.four },
  legend: { gap: Spacing.two },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  legendBox: { width: 18, height: 18, borderRadius: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 5 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { maxHeight: '70%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.two },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  sheetTitle: { flex: 1 },
  sheetLoading: { paddingVertical: Spacing.four },
  sheetBody: { gap: Spacing.three, paddingBottom: Spacing.four },
  card: { borderWidth: 1, borderRadius: 8, padding: Spacing.three, gap: Spacing.half },
});
