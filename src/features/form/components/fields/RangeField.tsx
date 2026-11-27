import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { decimalsOf, Slider, snap } from './Slider';
import { useInputStyle } from './inputStyle';

/**
 * Intervalle (décision 2026-11-19-contrat-multiselect-intervalle-equipements) : deux
 * saisies côte à côte, « Min » et « Max », sous un même libellé ; chacune peut rester
 * vide. Avec des bornes servies (`range`), un curseur à deux poignées à la place (décision
 * 2026-11-27-intervalle-curseur). La valeur est `[min, max]` ; l'unité se lit dans l'aide (`FieldShell`).
 */
export function RangeField(props: FieldProps<string[]>) {
  const { field } = props;

  // Des bornes servies : un curseur à deux poignées ; sinon, les deux saisies (décision 2026-11-27-intervalle-curseur).
  return typeof field.range?.min === 'number' && typeof field.range?.max === 'number' ? <RangeSliderField {...props} /> : <RangeInputsField {...props} />;
}

/**
 * L'intervalle en curseur, entre les bornes servies et par leur incrément : la plage choisie en grand
 * (« 50 000 – 200 000 »), l'unité dans l'aide, et deux poignées. Une poignée laissée au bout ne borne rien : sa valeur
 * part vide, comme une saisie laissée vide.
 */
function RangeSliderField({ field, value, onChange, error, disabled }: FieldProps<string[]>) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const min = Number(field.range?.min);
  const max = Number(field.range?.max);
  const step = typeof field.range?.step === 'number' && field.range.step > 0 ? field.range.step : 1;
  const decimals = decimalsOf(step);
  const parse = (raw: string | undefined) => (raw === undefined || raw === '' || Number.isNaN(Number(raw)) ? null : snap(Number(raw), min, max, step));
  const low = parse(value[0]);
  const high = parse(value[1]);
  const format = (number: number) => number.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const shownLow = format(low ?? min);
  const shownHigh = format(high ?? max);

  function choose(index: number, next: number) {
    const values = [low ?? min, high ?? max];
    values[index] = next;
    // Au bout de la piste : pas de borne.
    onChange([values[0] <= min ? '' : values[0].toFixed(decimals), values[1] >= max ? '' : values[1].toFixed(decimals)]);
  }

  return (
    <FieldShell field={field} error={error}>
      <Text style={[styles.shown, { color: theme.text }]} testID={`field-${field.name}-value`}>
        {shownLow} – {shownHigh}
      </Text>
      <Slider
        values={[low, high]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={choose}
        label={field.label ?? field.name}
        valueTexts={[shownLow, shownHigh]}
        thumbLabels={[t('form.rangeMin'), t('form.rangeMax')]}
        testID={`field-${field.name}`}
      />
    </FieldShell>
  );
}

/** Les deux saisies « Min » et « Max ». */
function RangeInputsField({ field, value, onChange, error, disabled }: FieldProps<string[]>) {
  const { t } = useI18n();
  const theme = useTheme();
  const inputStyle = useInputStyle(Boolean(error), Boolean(field.readonly));
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
  shown: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  row: { flexDirection: 'row', gap: Spacing.two },
  input: { flex: 1 },
});
