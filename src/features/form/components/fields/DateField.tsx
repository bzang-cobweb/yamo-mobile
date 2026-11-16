import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { formatDate, MIN_DATE, parseIsoDate, toIsoDate } from '../../utils/dates';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/**
 * Date seule (`AAAA-MM-JJ`) avec le sélecteur natif : calendrier déplié sous le
 * champ sur iOS (replié dès qu'une date est choisie), boîte de dialogue sur
 * Android. Limitée à aujourd'hui. Un champ facultatif peut être vidé (« Effacer »,
 * sous le champ → valeur vide).
 */
export function DateField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const { t, locale } = useI18n();
  const inputStyle = useInputStyle(Boolean(error));
  const [open, setOpen] = useState(false);
  const date = parseIsoDate(value);
  const today = new Date();

  function choose(event: DateTimePickerEvent, chosen?: Date) {
    if (event.type === 'set' && chosen) {
      onChange(toIsoDate(chosen));
      // Date choisie : le calendrier se replie (il cachait le reste du formulaire).
      setOpen(false);
    }
  }

  function toggle() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: date ?? today, mode: 'date', minimumDate: MIN_DATE, maximumDate: today, onChange: choose });
    } else {
      setOpen((current) => !current);
    }
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
        onPress={toggle}
        style={inputStyle}>
        <ThemedText themeColor={date ? 'text' : 'textSecondary'}>
          {date ? formatDate(date, locale) : (field.placeholder ?? t('form.selectPlaceholder'))}
        </ThemedText>
      </Pressable>

      {!field.required && date && (
        <View style={styles.actions}>
          <Pressable
            testID={`field-${field.name}-clear`}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => {
              setOpen(false);
              onChange('');
            }}>
            <ThemedText type="linkPrimary">{t('form.clearDate')}</ThemedText>
          </Pressable>
        </View>
      )}
      {open && Platform.OS !== 'android' && (
        <DateTimePicker
          testID={`field-${field.name}-picker`}
          value={date ?? today}
          mode="date"
          display="inline"
          locale={locale}
          minimumDate={MIN_DATE}
          maximumDate={today}
          onChange={choose}
        />
      )}
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: Spacing.one },
});
