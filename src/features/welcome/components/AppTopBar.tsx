import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountrySwitcher } from '@/features/country/components/CountrySwitcher';
import { BrandLogo } from '@/shared/brand/BrandLogo';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { Spacing } from '@/shared/theme/theme';

import { LocaleSwitcher } from './LocaleSwitcher';

const BAR_HEIGHT = 52;
const LOGO_HEIGHT = 24;

/**
 * Barre fixe du haut, la même pour un visiteur et un membre (décision
 * 2026-11-18-accueil-offres-du-pays) : le mot « YaMo » à gauche, livré avec l'app
 * (décision 2026-11-17-logo-livre-avec-le-code) ; à droite, la langue et le pays,
 * chacun ouvrant sa liste.
 */
export function AppTopBar() {
  return (
    <ThemedView testID="app-top-bar">
      <SafeAreaView edges={['top', 'left', 'right']}>
        <View style={styles.bar}>
          <BrandLogo variant="word" height={LOGO_HEIGHT} testID="app-top-bar-logo" />
          <View style={styles.selectors}>
            <LocaleSwitcher />
            <CountrySwitcher />
          </View>
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
  selectors: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
