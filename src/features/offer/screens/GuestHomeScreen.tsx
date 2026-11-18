import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTopBar } from '@/features/welcome/components/AppTopBar';
import { LocaleSwitcher } from '@/features/welcome/components/LocaleSwitcher';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { BrowseScreen } from './BrowseScreen';

/**
 * Accueil d'un visiteur (décision 2026-11-18-accueil-offres-du-pays) : la barre du
 * haut (logo, pays), les offres du pays, et en bas « Se connecter » et « Créer un
 * compte », puis la langue (décision 2026-11-19-titre-tirets-avis).
 */
export function GuestHomeScreen() {
  const { t } = useI18n();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <AppTopBar />
      <View style={styles.container}>
        <BrowseScreen />
      </View>
      <SafeAreaView edges={['bottom', 'left', 'right']}>
        <View style={styles.actions}>
          <Pressable
            testID="welcome-sign-in"
            accessibilityRole="button"
            onPress={() => router.push('/sign-in')}
            style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, borderColor: theme.primary }, pressed && styles.pressed]}>
            <ThemedText style={{ color: theme.onPrimary }}>{t('auth.signIn')}</ThemedText>
          </Pressable>
          <Pressable
            testID="welcome-sign-up"
            accessibilityRole="button"
            onPress={() => router.push('/sign-up')}
            style={({ pressed }) => [styles.button, styles.secondary, { borderColor: theme.primary }, pressed && styles.pressed]}>
            <ThemedText style={{ color: theme.primary }}>{t('auth.createAccount')}</ThemedText>
          </Pressable>
        </View>
        {/* La langue, après les boutons (décision 2026-11-19-titre-tirets-avis). */}
        <View style={styles.language}>
          <LocaleSwitcher />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  language: { alignItems: 'center', paddingVertical: Spacing.two },
  button: { flex: 1, alignItems: 'center', borderRadius: 8, paddingVertical: Spacing.three, borderWidth: 1 },
  secondary: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.8 },
});
