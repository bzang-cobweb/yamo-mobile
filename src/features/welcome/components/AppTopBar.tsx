import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { Spacing } from '@/shared/theme/theme';

import { useApplication } from '../hooks/useApplication';

const BAR_HEIGHT = 48;
const LOGO_HEIGHT = 32;
const LOGO_WIDTH = 160;

/**
 * Barre fixe en haut des écrans d'un utilisateur connecté : le logo de
 * l'application, son nom s'il n'y a pas de logo (réglés dans le back-office).
 */
export function AppTopBar() {
  const { data: application } = useApplication();

  return (
    <ThemedView testID="app-top-bar">
      <SafeAreaView edges={['top', 'left', 'right']}>
        <View style={styles.bar}>
          {application?.logo_url ? (
            <Image
              testID="app-top-bar-logo"
              accessibilityRole="image"
              accessibilityLabel={application.name}
              source={{ uri: application.logo_url }}
              style={styles.logo}
              contentFit="contain"
            />
          ) : (
            application && (
              <ThemedText type="smallBold" accessibilityRole="header" numberOfLines={1} testID="app-top-bar-name">
                {application.name}
              </ThemedText>
            )
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: { height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  logo: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
});
