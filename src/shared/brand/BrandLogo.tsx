import { Image, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';

import { useColorScheme } from '@/shared/theme/hooks/use-color-scheme';

/** Nom de la marque, lu par les lecteurs d'écran à la place du logo. */
export const BRAND_NAME = 'YaMo';

/**
 * Fichiers du logo, livrés avec l'app (copies de `web/public/images/logo`) :
 * `couleur` sur fond clair, `inverse` sur fond sombre.
 */
const SOURCES = {
  word: {
    light: require('../../../assets/images/logo/yamo-mot-couleur.svg'),
    dark: require('../../../assets/images/logo/yamo-mot-inverse.svg'),
  },
  vertical: {
    light: require('../../../assets/images/logo/yamo-logo-vertical-couleur.svg'),
    dark: require('../../../assets/images/logo/yamo-logo-vertical-inverse.svg'),
  },
  symbol: {
    light: require('../../../assets/images/logo/yamo-symbole-couleur.svg'),
    dark: require('../../../assets/images/logo/yamo-symbole-inverse.svg'),
  },
} as const;

/** Proportions largeur / hauteur de chaque déclinaison. */
export const BRAND_RATIOS = { word: 210 / 60, vertical: 168 / 132, symbol: 92 / 60 } as const;

type Props = {
  /** `word` : le mot seul ; `vertical` : symbole au-dessus du mot ; `symbol` : les deux cercles. */
  variant: keyof typeof SOURCES;
  /** Hauteur affichée ; la largeur suit les proportions du logo. */
  height: number;
  style?: StyleProp<ImageStyle>;
  testID?: string;
};

/**
 * Logo YaMo, dans la version qui convient au thème clair ou sombre.
 */
export function BrandLogo({ variant, height, style, testID }: Props) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return (
    <Image
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={BRAND_NAME}
      source={SOURCES[variant][scheme]}
      style={[{ height, width: height * BRAND_RATIOS[variant] }, style]}
      contentFit="contain"
    />
  );
}
