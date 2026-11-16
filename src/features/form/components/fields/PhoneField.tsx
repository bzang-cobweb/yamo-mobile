import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';
import { OptionsModal } from './OptionsModal';

/**
 * Téléphone : sur une ligne, le pays (son indicatif) puis le numéro. Le pays se
 * choisit parmi les options (pays actifs, indicatif en `hint`) ; l'API vérifie le
 * numéro selon ce pays. Valeurs : `<nom>` (numéro) et `<nom>_country` (code ISO).
 */
export function PhoneField({ field, value, onChange, error, disabled, country, onCountryChange }: FieldProps<string>) {
  const { t } = useI18n();
  const theme = useTheme();
  const inputStyle = useInputStyle(Boolean(error));
  const [open, setOpen] = useState(false);
  const selected = field.options.find((option) => option.value === country);

  return (
    <FieldShell field={field} error={error}>
      <View style={styles.row}>
        <Pressable
          testID={`field-${field.name}-country`}
          accessibilityRole="button"
          accessibilityLabel={selected?.label ?? t('form.selectPlaceholder')}
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={[inputStyle, styles.country]}>
          <ThemedText themeColor={selected ? 'text' : 'textSecondary'}>
            {selected ? `${selected.value} ${selected.hint ?? ''}`.trim() : '+'}
          </ThemedText>
        </Pressable>
        <TextInput
          testID={`field-${field.name}`}
          accessibilityLabel={field.label ?? field.name}
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          placeholder={field.placeholder ?? undefined}
          placeholderTextColor={theme.textSecondary}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          style={[inputStyle, styles.number, disabled && styles.readonly]}
        />
      </View>
      <OptionsModal
        visible={open}
        title={field.label}
        options={field.options}
        selected={country ?? ''}
        onSelect={(code) => onCountryChange?.(code)}
        onClose={() => setOpen(false)}
        testIDPrefix={`field-${field.name}-country`}
      />
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  country: { minWidth: 92, justifyContent: 'center' },
  number: { flex: 1 },
  readonly: { opacity: 0.7 },
});
