import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/** Liste déroulante : la valeur choisie s'affiche ; un appui ouvre la liste des options. */
export function SelectField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const { t } = useI18n();
  const inputStyle = useInputStyle(Boolean(error));
  const [open, setOpen] = useState(false);
  const selected = field.options.find((option) => option.value === value);

  return (
    <FieldShell field={field} error={error}>
      <Pressable
        testID={`field-${field.name}`}
        accessibilityRole="button"
        accessibilityLabel={field.label ?? field.name}
        accessibilityValue={{ text: selected?.label }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={inputStyle}>
        <ThemedText themeColor={selected ? 'text' : 'textSecondary'}>
          {selected?.label ?? field.placeholder ?? t('form.selectPlaceholder')}
        </ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <ThemedView type="backgroundElement" style={styles.sheet}>
            {field.label !== null && <ThemedText type="smallBold">{field.label}</ThemedText>}
            <ScrollView>
              {field.options.map((option) => (
                <Pressable
                  key={option.value}
                  testID={`field-${field.name}-option-${option.value}`}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: option.value === value }}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <View style={styles.optionRow}>
                    <ThemedText>{option.label}</ThemedText>
                    {option.value === value && <ThemedText type="smallBold">✓</ThemedText>}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Modal>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two, maxHeight: '70%' },
  option: { paddingVertical: Spacing.three },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pressed: { opacity: 0.6 },
});
