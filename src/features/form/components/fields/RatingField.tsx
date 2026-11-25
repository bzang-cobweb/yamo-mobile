import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';

const VALUES = ['1', '2', '3', '4', '5'] as const;

/**
 * Note en étoiles, de 1 à 5 (décision 2026-11-19-contrat-avis-offres) : toucher
 * la 4ᵉ étoile donne « 4 ». Chaque étoile est lue « 4 sur 5 » par
 * l'accessibilité ; la note choisie est annoncée comme sélectionnée.
 */
export function RatingField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const { t } = useI18n();
  const theme = useTheme();
  const current = Number(value) || 0;

  return (
    <FieldShell field={field} error={error}>
      <View accessibilityRole="radiogroup" accessibilityLabel={field.label ?? field.name} style={styles.row}>
        {VALUES.map((star) => {
          const selected = star === value;

          return (
            <Pressable
              key={star}
              testID={`field-${field.name}-star-${star}`}
              accessibilityRole="radio"
              accessibilityLabel={t('form.ratingValue', { value: star })}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              hitSlop={Spacing.one}
              onPress={() => onChange(star)}
              style={({ pressed }) => [styles.star, pressed && styles.pressed]}>
              <Text style={[styles.glyph, { color: Number(star) <= current ? theme.text : theme.backgroundSelected }]}>★</Text>
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  star: { padding: Spacing.half },
  pressed: { opacity: 0.6 },
  glyph: { fontSize: 36, lineHeight: 42 },
});
