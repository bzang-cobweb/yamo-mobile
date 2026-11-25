import { StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme/hooks/use-theme';
import { BRAND_FONTS, Spacing } from '@/shared/theme/theme';

import { ERROR_COLOR } from '../FieldShell';

/** Style commun des zones de saisie, selon le thème et l'état d'erreur. */
export function useInputStyle(hasError: boolean) {
  const theme = useTheme();

  return [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
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
});
