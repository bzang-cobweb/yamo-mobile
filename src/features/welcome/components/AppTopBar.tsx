import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountrySwitcher } from '@/features/country/components/CountrySwitcher';
import { BrandLogo } from '@/shared/brand/BrandLogo';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { Spacing } from '@/shared/theme/theme';


const BAR_HEIGHT = 52;
const LOGO_HEIGHT = 24;

/**
 * Barre fixe du haut (décision 2026-11-18-accueil-offres-du-pays) : le mot « YaMo » à gauche, livré avec l'app
 * (décision 2026-11-17-logo-livre-avec-le-code) ; à droite, le drapeau du pays,
 * qui ouvre sa liste. La langue est en bas de l'accueil d'un visiteur ; connecté,
 * elle se règle dans les préférences du compte (décision 2026-11-19-titre-tirets-avis).
 */
export function AppTopBar() {
  return (
    <ThemedView testID="app-top-bar">
      <SafeAreaView edges={['top', 'left', 'right']}>
        <View style={styles.bar}>
          <BrandLogo variant="word" height={LOGO_HEIGHT} testID="app-top-bar-logo" />
          <CountrySwitcher />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
});
