import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/shared/brand/BrandLogo';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { Spacing } from '@/shared/theme/theme';

const BAR_HEIGHT = 48;
const LOGO_HEIGHT = 24;

/**
 * Barre fixe en haut des écrans d'un utilisateur connecté : toujours le mot
 * « YaMo » seul, aligné à gauche, livré avec l'app (décision 2026-11-17-logo-livre-avec-le-code).
 */
export function AppTopBar() {
  return (
    <ThemedView testID="app-top-bar">
      <SafeAreaView edges={['top', 'left', 'right']}>
        <View style={styles.bar}>
          <BrandLogo variant="word" height={LOGO_HEIGHT} testID="app-top-bar-logo" />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: { height: BAR_HEIGHT, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: Spacing.four },
});
