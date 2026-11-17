import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { Spacing } from '@/shared/theme/theme';

import { Avatar } from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';

/** Accueil (onglet par défaut) : la photo et le nom complet de l'utilisateur. */
export function HomeScreen() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Avatar user={user} />
        <ThemedText type="subtitle" style={styles.fullName} testID="home-full-name">
          {user.full_name}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  fullName: { textAlign: 'center' },
});
