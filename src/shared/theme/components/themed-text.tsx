import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, fontFamilyFor, ThemeColor } from '@/shared/theme/theme';
import { useTheme } from '@/shared/theme/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  // Un lien principal prend la couleur de marque, sauf couleur demandée.
  const color = theme[themeColor ?? (type === 'linkPrimary' ? 'primary' : 'text')];

  // Nunito : le fichier de la graisse demandée (décision 2026-11-25-police-nunito) ; une famille donnée (le code) est
  // gardée.
  const flat: TextStyle = StyleSheet.flatten([styles[type], style]) ?? {};
  const font = flat.fontFamily ? null : { fontFamily: fontFamilyFor(flat.fontWeight) };

  return <Text style={[{ color }, styles[type], style, font]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  // Le titre d'une page (fiche, calendrier, membre, formulaire, notifications), plus petit (décision
  // 2026-11-22-titres-plus-petits).
  subtitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
