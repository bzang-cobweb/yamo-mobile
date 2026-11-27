import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/**
 * Liste déroulante à choix multiples (décision
 * 2026-11-19-contrat-multiselect-intervalle-equipements) : le champ affiche les
 * choix faits (« Studio, Maison ») ; un appui ouvre les options, une case chacune,
 * et « Valider » garde les choix. La valeur est la liste des options choisies.
 */
export function MultiSelectField({ field, value, onChange, error, disabled }: FieldProps<string[]>) {
  const { t } = useI18n();
  const theme = useTheme();
  const inputStyle = useInputStyle(Boolean(error), Boolean(field.readonly));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const labels = field.options.filter((option) => value.includes(option.value)).map((option) => option.label);

  function show() {
    setDraft(value);
    setOpen(true);
  }

  function toggle(optionValue: string) {
    setDraft(draft.includes(optionValue) ? draft.filter((v) => v !== optionValue) : [...draft, optionValue]);
  }

  function confirm() {
    // Dans l'ordre des options.
    onChange(field.options.map((option) => option.value).filter((v) => draft.includes(v)));
    setOpen(false);
  }

  return (
    <FieldShell field={field} error={error}>
      <Pressable
        testID={`field-${field.name}`}
        accessibilityRole="button"
        accessibilityLabel={field.label ?? field.name}
        accessibilityValue={{ text: labels.join(', ') }}
        disabled={disabled}
        onPress={show}
        style={inputStyle}>
        <ThemedText themeColor={labels.length > 0 ? 'text' : 'textSecondary'} numberOfLines={2}>
          {labels.length > 0 ? labels.join(', ') : (field.placeholder ?? t('form.selectPlaceholder'))}
        </ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <ThemedView type="backgroundElement" style={styles.sheet}>
            {field.label !== null && <ThemedText type="smallBold">{field.label}</ThemedText>}
            <ScrollView>
              {field.options.map((option) => {
                const checked = draft.includes(option.value);

                return (
                  <Pressable
                    key={option.value}
                    testID={`field-${field.name}-option-${option.value}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() => toggle(option.value)}
                    style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                    <View style={[styles.box, { borderColor: theme.text }, checked && { backgroundColor: theme.text }]}>
                      {checked && <ThemedText style={[styles.check, { color: theme.background }]}>✓</ThemedText>}
                    </View>
                    <ThemedText style={styles.label}>{option.label}</ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              testID={`field-${field.name}-confirm`}
              accessibilityRole="button"
              onPress={confirm}
              style={({ pressed }) => [styles.confirm, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                {t('form.confirm')}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Modal>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two, maxHeight: '75%' },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  box: { width: 22, height: 22, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  check: { fontSize: 14, lineHeight: 16, fontWeight: '700' },
  label: { flex: 1 },
  confirm: { alignItems: 'center', borderRadius: 8, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
});
