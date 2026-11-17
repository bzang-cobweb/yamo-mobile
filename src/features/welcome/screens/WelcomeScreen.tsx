import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useApplication } from '../hooks/useApplication';

const LOGO_SIZE = 160;

/**
 * Accueil, premier écran d'un invité : logo de l'application centré (son nom s'il
 * n'y a pas de logo) et sa description, réglés dans le back-office ; puis les
 * boutons de connexion et de création de compte.
 */
export function WelcomeScreen() {
  const { t } = useI18n();
  const { data: application, isPending } = useApplication();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.presentation}>
            {isPending ? (
              <ActivityIndicator testID="welcome-loading" />
            ) : application?.logo_url ? (
              <Image
                testID="welcome-logo"
                accessibilityRole="image"
                accessibilityLabel={application.name}
                source={{ uri: application.logo_url }}
                style={styles.logo}
                contentFit="contain"
              />
            ) : (
              application && (
                <ThemedText type="title" accessibilityRole="header" style={styles.centered} testID="welcome-name">
                  {application.name}
                </ThemedText>
              )
            )}
            {application?.description && (
              <ThemedText themeColor="textSecondary" style={styles.centered} testID="welcome-description">
                {application.description}
              </ThemedText>
            )}
          </View>
          <View style={styles.actions}>
            <Pressable
              testID="welcome-sign-in"
              accessibilityRole="button"
              onPress={() => router.push('/sign-in')}
              style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}>
              <ThemedText style={styles.primaryText}>{t('auth.signIn')}</ThemedText>
            </Pressable>
            <Pressable
              testID="welcome-sign-up"
              accessibilityRole="button"
              onPress={() => router.push('/sign-up')}
              style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}>
              <ThemedText style={styles.secondaryText}>{t('auth.createAccount')}</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const PRIMARY = '#208AEF';

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
  // Logo et description au centre de l'espace libre ; les boutons en bas.
  presentation: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  centered: { textAlign: 'center' },
  actions: { gap: Spacing.two },
  button: { alignItems: 'center', borderRadius: 8, paddingVertical: Spacing.three, borderWidth: 1, borderColor: PRIMARY },
  primary: { backgroundColor: PRIMARY },
  secondary: { backgroundColor: 'transparent' },
  primaryText: { color: '#fff' },
  secondaryText: { color: PRIMARY },
  pressed: { opacity: 0.8 },
});
