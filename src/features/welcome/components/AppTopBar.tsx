import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountryFlag } from '@/features/country/components/CountryFlag';
import { BrandLogo } from '@/shared/brand/BrandLogo';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { Spacing } from '@/shared/theme/theme';

const BAR_HEIGHT = 48;
const LOGO_HEIGHT = 24;

/**
 * Barre fixe en haut des écrans d'un utilisateur connecté : toujours le mot
 * « YaMo », aligné à gauche, livré avec l'app (décision 2026-11-17-logo-livre-avec-le-code),
 * et le drapeau du pays courant à droite (décision 2026-11-18-espace-pays).
 */
export function AppTopBar() {
  return (
    <ThemedView testID="app-top-bar">
      <SafeAreaView edges={['top', 'left', 'right']}>
        <View style={styles.bar}>
          <BrandLogo variant="word" height={LOGO_HEIGHT} testID="app-top-bar-logo" />
          <CountryFlag />
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
