import { StyleSheet, Text, View } from 'react-native';

import { Stars } from '@/shared/components/Stars';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { decimalsOf, Slider, snap } from './Slider';

/**
 * Note au dixième entre les bornes servies (1 et 5 par défaut ; décisions 2026-11-27-note-au-dixieme et
 * 2026-11-27-note-bornes-etoiles) : la note en grand (« 3,2 / 5 »), les étoiles remplies au dixième si le champ les
 * demande, et un curseur dessous. Glisser le pouce ou toucher la piste choisit la note ; l'accessibilité la règle
 * d'un incrément à l'autre (0,1 par défaut, servi dans `range.step`). Sans note choisie, un tiret et le pouce au début. La valeur envoyée : « 3.2 ».
 */
export function RatingField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const min = typeof field.range?.min === 'number' ? field.range.min : 1;
  const max = typeof field.range?.max === 'number' ? field.range.max : 5;
  const step = typeof field.range?.step === 'number' && field.range.step > 0 ? field.range.step : 0.1;
  const decimals = decimalsOf(step);
  const stars = field.stars ?? true;
  const current = value === '' || value === null || value === undefined || Number.isNaN(Number(value)) ? null : snap(Number(value), min, max, step);
  const shown = current === null ? '–' : current.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  function choose(next: number) {
    const rounded = snap(next, min, max, step);
    if (rounded !== current) {
      onChange(rounded.toFixed(decimals));
    }
  }

  return (
    <FieldShell field={field} error={error}>
      <View style={styles.head}>
        <Text style={[styles.value, { color: theme.text }]} testID={`field-${field.name}-value`}>
          {shown}
        </Text>
        <ThemedText themeColor="textSecondary">/ {max.toLocaleString(locale)}</ThemedText>
      </View>
      {/* Cinq étoiles, remplies à la part de la note sur son maximum. */}
      {stars && <Stars value={current === null ? 0 : (current / max) * 5} size={28} emptyColor={theme.backgroundSelected} testID={`field-${field.name}-stars`} />}
      <Slider
        values={[current]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(_index, next) => choose(next)}
        label={field.label ?? field.name}
        valueTexts={[current === null ? undefined : t('form.ratingValue', { value: shown })]}
        testID={`field-${field.name}`}
      />
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  value: { fontSize: 32, lineHeight: 38, fontWeight: '600' },
});
