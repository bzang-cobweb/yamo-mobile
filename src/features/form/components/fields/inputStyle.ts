import { StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme/hooks/use-theme';
import { BRAND_FONTS, Spacing } from '@/shared/theme/theme';

import { ERROR_COLOR } from '../FieldShell';

/**
 * Style commun des zones de saisie, selon le thème et l'état d'erreur. En lecture seule, sans fond ni marges
 * intérieures : la valeur se lit alignée sur son libellé, sans avoir l'air d'un champ à remplir (décision
 * 2026-11-27-lecture-seule-sans-fond).
 */
export function useInputStyle(hasError: boolean, readonly = false) {
  const theme = useTheme();

  return [
    styles.input,
    { color: theme.text, backgroundColor: readonly ? 'transparent' : theme.backgroundElement },
    readonly && styles.readonly,
    hasError && { borderColor: ERROR_COLOR },
  ];
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    // La police de l'app aussi dans les champs (décision 2026-11-25-police-nunito).
    fontFamily: BRAND_FONTS[500],
  },
  readonly: { paddingHorizontal: 0, paddingVertical: 0 },
});
