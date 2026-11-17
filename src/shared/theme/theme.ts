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
