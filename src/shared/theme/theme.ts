/**
 * Couleurs de l'app, en mode clair et sombre. Les couleurs de marque viennent du
 * logo YaMo (`public/images/logo` de l'app Laravel) : violet pour l'action
 * principale (boutons, liens, sélection), rose en accent ; leurs variantes plus
 * claires du logo « inverse » en mode sombre. Les erreurs restent rouges, pour ne
 * pas se confondre avec le rose.
 */

import '@/shared/theme/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    /** Violet du logo : boutons, liens, sélection. */
    primary: '#7B5CFA',
    /** Texte et icônes posés sur `primary`. */
    onPrimary: '#ffffff',
    /** Rose du logo, en accent. */
    accent: '#FF5A7A',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: '#9C82FF',
    onPrimary: '#ffffff',
    accent: '#FF7A93',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * La police de l'app : Nunito, ronde, la même sur iOS, Android et le web (décision 2026-11-25-police-nunito). Une
 * police chargée a un fichier par graisse : `fontFamilyFor()` donne celui d'une graisse.
 */
export const BRAND_FONTS = {
  400: 'Nunito_400Regular',
  500: 'Nunito_500Medium',
  600: 'Nunito_600SemiBold',
  700: 'Nunito_700Bold',
  800: 'Nunito_800ExtraBold',
} as const;

/** Le fichier Nunito d'une graisse (« 700 », 700, « bold ») : la plus proche, 400 par défaut. */
export function fontFamilyFor(weight: string | number | undefined): string {
  const value = weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : Number(weight);
  const known = [400, 500, 600, 700, 800] as const;
  const nearest = known.reduce((best, candidate) => (Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best), 400);

  return BRAND_FONTS[Number.isNaN(value) ? 400 : nearest];
}

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
