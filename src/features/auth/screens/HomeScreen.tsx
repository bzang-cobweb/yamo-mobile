import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/shared/theme/components/themed-view';
import { Spacing } from '@/shared/theme/theme';

import { SignOutButton } from '../components/SignOutButton';
import { UserSummary } from '../components/UserSummary';
import { useAuth } from '../hooks/useAuth';

/** Accueil de l'utilisateur connecté. */
export function HomeScreen() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <UserSummary user={user} />
        <ThemedView style={styles.actions}>
          <SignOutButton />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  actions: { marginTop: Spacing.four, alignItems: 'center', gap: Spacing.two },
});
