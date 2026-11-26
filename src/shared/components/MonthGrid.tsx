import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { TONE_COLORS } from './StatusTag';

/**
 * Un jour de la grille. `state` colore la case (`accepted`, `pending`, `conflict`,
 * `blocked`, `past`, `free`) ; `dot` met un point dessous (`success`, `warning`) ;
 * `disabled` la grise et la rend inactive ; `selected` et `inRange` marquent une
 * période choisie.
 */
export type MonthGridCell = {
  date: string;
  day: number;
  state?: string;
  dot?: string | null;
  disabled?: boolean;
  selected?: boolean;
  inRange?: boolean;
};

type Props = {
  /** « Décembre 2026 ». */
  label: string;
  /** Lundi à dimanche, abrégés. */
  weekdays: string[];
  /** Cases vides avant le 1er (0 : lundi). */
  offset: number;
  cells: MonthGridCell[];
  onPress?: (date: string) => void;
  /** Mois précédent ou suivant ; `null` : pas de flèche. Glisser horizontalement fait de même. */
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  previousLabel: string;
  nextLabel: string;
  testID: string;
};

/** Distance d'un glissement horizontal qui change de mois. */
const SWIPE = 50;

/**
 * Une grille de mois faite à la main, sans bibliothèque (décision
 * 2026-11-19-contrat-calendrier-offre) : le mois et ses flèches, les jours de la
 * semaine, puis les jours en sept colonnes. Mêmes couleurs que les pastilles de
 * statut. Sert le calendrier d'une offre et le choix des dates d'une réservation.
 */
export function MonthGrid({ label, weekdays, offset, cells, onPress, onPrevious, onNext, previousLabel, nextLabel, testID }: Props) {
  const theme = useTheme();
  const start = useRef<{ x: number; y: number } | null>(null);
  const blanks = Array.from({ length: offset }, (_, index) => `blank-${index}`);

  function touchStart(event: GestureResponderEvent) {
    start.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
  }

  function touchEnd(event: GestureResponderEvent) {
    if (!start.current) {
      return;
    }
    const dx = event.nativeEvent.pageX - start.current.x;
    const dy = event.nativeEvent.pageY - start.current.y;
    start.current = null;
    if (Math.abs(dx) > SWIPE && Math.abs(dy) < SWIPE) {
      (dx < 0 ? onNext : onPrevious)?.();
    }
  }

  function arrow(direction: 'previous' | 'next') {
    const action = direction === 'previous' ? onPrevious : onNext;

    return (
      <Pressable
        testID={`${testID}-${direction}`}
        accessibilityRole="button"
        accessibilityLabel={direction === 'previous' ? previousLabel : nextLabel}
        accessibilityState={{ disabled: action === null }}
        disabled={action === null}
        hitSlop={Spacing.two}
        onPress={() => action?.()}
        style={[styles.arrow, action === null && styles.hidden]}>
        <SymbolView
          name={direction === 'previous' ? { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' } : { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={18}
          tintColor={theme.text}
        />
      </Pressable>
    );
  }

  return (
    <View testID={testID} onTouchStart={touchStart} onTouchEnd={touchEnd}>
      <View style={styles.header}>
        {arrow('previous')}
        <ThemedText type="smallBold" testID={`${testID}-label`} accessibilityRole="header">
          {label}
        </ThemedText>
        {arrow('next')}
      </View>
      <View style={styles.grid}>
        {weekdays.map((weekday, index) => (
          <View key={`weekday-${index}`} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {weekday}
            </ThemedText>
          </View>
        ))}
        {blanks.map((key) => (
          <View key={key} style={styles.cell} />
        ))}
        {cells.map((cell) => {
          const colors = cellColors(cell, theme);

          return (
            <View key={cell.date} style={styles.cell}>
              <Pressable
                testID={`${testID}-day-${cell.date}`}
                accessibilityRole="button"
                accessibilityLabel={cell.date}
                accessibilityState={{ disabled: Boolean(cell.disabled), selected: Boolean(cell.selected) }}
                disabled={Boolean(cell.disabled) || !onPress}
                onPress={() => onPress?.(cell.date)}
                style={({ pressed }) => [styles.day, colors.box, pressed && styles.pressed]}>
                <ThemedText type="small" style={[styles.center, colors.text]}>
                  {cell.day}
                </ThemedText>
                {cell.dot ? <View style={[styles.dot, { backgroundColor: TONE_COLORS[cell.dot] ?? TONE_COLORS.neutral }]} testID={`${testID}-dot-${cell.date}`} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Les couleurs d'une case selon son état, sa sélection et son accès. */
function cellColors(cell: MonthGridCell, theme: ReturnType<typeof useTheme>) {
  const white = { color: '#ffffff' };

  // Le jour choisi : fond noir, texte blanc, comme toute sélection d'un champ (décision 2026-11-26-selection-noir-et-blanc).
  if (cell.selected) {
    return { box: { backgroundColor: theme.text }, text: { color: theme.background } };
  }
  if (cell.inRange) {
    return { box: { backgroundColor: theme.backgroundSelected }, text: {} };
  }
  switch (cell.state) {
    case 'accepted':
      return { box: { backgroundColor: TONE_COLORS.success }, text: white };
    case 'pending':
      return { box: { backgroundColor: TONE_COLORS.warning }, text: white };
    case 'conflict':
      return { box: { backgroundColor: TONE_COLORS.danger }, text: white };
    case 'blocked':
      return { box: { backgroundColor: TONE_COLORS.neutral }, text: { ...white, textDecorationLine: 'line-through' as const } };
    case 'past':
      return { box: { opacity: 0.4 }, text: {} };
    default:
      return cell.disabled ? { box: { opacity: 0.3 }, text: { textDecorationLine: 'line-through' as const } } : { box: {}, text: {} };
  }
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Spacing.two },
  arrow: { padding: Spacing.one },
  hidden: { opacity: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  day: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  center: { textAlign: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, position: 'absolute', bottom: 4 },
  pressed: { opacity: 0.6 },
});
