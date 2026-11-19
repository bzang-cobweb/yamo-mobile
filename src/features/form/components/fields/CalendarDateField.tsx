import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MonthGrid, type MonthGridCell } from '@/shared/components/MonthGrid';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { formatDate, parseIsoDate, toIsoDate } from '../../utils/dates';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/** Un lundi connu, pour nommer les jours de la semaine dans la langue. */
const MONDAY = new Date(2024, 0, 1);

/**
 * Date choisie sur une grille de mois (décision 2026-11-19-contrat-calendrier-offre),
 * dépliée sous le champ : les jours hors bornes (`date_range`) et indisponibles
 * (`calendar.unavailable`) sont grisés. Fin d'une période (`calendar.after`) : les
 * jours indisponibles sont des nuits prises ; la fin se choisit après le début et au
 * plus tard le premier jour pris qui le suit (on part le matin), la période choisie
 * est surlignée.
 */
export function CalendarDateField({ field, value, onChange, error, disabled, afterValue }: FieldProps<string>) {
  const { t, locale } = useI18n();
  const inputStyle = useInputStyle(Boolean(error));
  const [open, setOpen] = useState(false);
  const date = parseIsoDate(value);
  const min = field.date_range?.min ?? null;
  const max = field.date_range?.max ?? null;
  const unavailable = new Set(field.calendar?.unavailable ?? []);
  const isEnd = Boolean(field.calendar?.after);
  const start = isEnd ? (afterValue ?? '') : '';
  // Fin de période : au plus tard le premier jour pris après le début.
  const limit = isEnd && start ? ([...unavailable].filter((day) => day > start).sort()[0] ?? null) : null;
  const first = parseIsoDate(value) ?? parseIsoDate(start) ?? parseIsoDate(min ?? '') ?? new Date();
  const [month, setMonth] = useState(new Date(first.getFullYear(), first.getMonth(), 1));

  function isDisabled(day: string): boolean {
    if ((min && day < min) || (max && day > max)) {
      return true;
    }
    if (!isEnd) {
      return unavailable.has(day);
    }

    return !start || day <= start || (limit !== null && day > limit);
  }

  const cells: MonthGridCell[] = [];
  for (let day = new Date(month); day.getMonth() === month.getMonth(); day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
    const iso = toIsoDate(day);
    cells.push({
      date: iso,
      day: day.getDate(),
      disabled: isDisabled(iso),
      selected: iso === value || (isEnd && iso === start),
      inRange: isEnd && Boolean(start) && Boolean(value) && iso > start && iso < value,
    });
  }

  const monthKey = (offset: number) => toIsoDate(new Date(month.getFullYear(), month.getMonth() + offset, 1)).slice(0, 7);
  const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month);
  const weekdays = Array.from({ length: 7 }, (_, offset) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(MONDAY.getFullYear(), MONDAY.getMonth(), MONDAY.getDate() + offset)),
  );

  function choose(day: string) {
    onChange(day);
    setOpen(false);
  }

  return (
    <FieldShell field={field} error={error}>
      <Pressable
        testID={`field-${field.name}`}
        accessibilityRole="button"
        accessibilityLabel={field.label ?? field.name}
        accessibilityValue={{ text: date ? formatDate(date, locale) : undefined }}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
        style={inputStyle}>
        <ThemedText themeColor={date ? 'text' : 'textSecondary'}>{date ? formatDate(date, locale) : (field.placeholder ?? t('form.selectPlaceholder'))}</ThemedText>
      </Pressable>
      {open && (
        <View style={styles.grid}>
          {isEnd && !start ? (
            <ThemedText type="small" themeColor="textSecondary" testID={`field-${field.name}-hint`}>
              {t('form.chooseStartFirst')}
            </ThemedText>
          ) : null}
          <MonthGrid
            testID={`field-${field.name}-grid`}
            label={label.charAt(0).toUpperCase() + label.slice(1)}
            weekdays={weekdays.map((weekday) => weekday.charAt(0).toUpperCase() + weekday.slice(1))}
            offset={(month.getDay() + 6) % 7}
            cells={cells}
            onPress={choose}
            onPrevious={!min || monthKey(0) > min.slice(0, 7) ? () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)) : null}
            onNext={!max || monthKey(0) < max.slice(0, 7) ? () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)) : null}
            previousLabel={t('form.previousMonth')}
            nextLabel={t('form.nextMonth')}
          />
        </View>
      )}
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  grid: { paddingTop: Spacing.two, gap: Spacing.two },
});
