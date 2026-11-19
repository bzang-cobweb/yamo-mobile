import { StyleSheet, TextInput, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/**
 * Intervalle (décision 2026-11-19-contrat-multiselect-intervalle-equipements) : deux
 * saisies côte à côte, « Min » et « Max », sous un même libellé ; chacune peut rester
 * vide. La valeur est `[min, max]` ; l'unité se lit dans l'aide (`FieldShell`).
 */
export function RangeField({ field, value, onChange, error, disabled }: FieldProps<string[]>) {
  const { t } = useI18n();
  const theme = useTheme();
  const inputStyle = useInputStyle(Boolean(error));
  const [min = '', max = ''] = value;
  const label = field.label ?? field.name;

  return (
    <FieldShell field={field} error={error}>
      <View style={styles.row}>
        <TextInput
          testID={`field-${field.name}-min`}
          accessibilityLabel={`${label} : ${t('form.rangeMin')}`}
          style={[inputStyle, styles.input]}
          value={min}
          onChangeText={(text) => onChange([text, max])}
          placeholder={t('form.rangeMin')}
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          editable={!disabled}
        />
        <TextInput
          testID={`field-${field.name}-max`}
          accessibilityLabel={`${label} : ${t('form.rangeMax')}`}
          style={[inputStyle, styles.input]}
          value={max}
          onChangeText={(text) => onChange([min, text])}
          placeholder={t('form.rangeMax')}
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          editable={!disabled}
        />
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  input: { flex: 1 },
});
