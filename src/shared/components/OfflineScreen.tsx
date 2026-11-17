import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/shared/brand/BrandLogo';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { Spacing } from '@/shared/theme/theme';

type Props = {
  onRetry: () => void;
  retrying: boolean;
};

/**
 * Démarrage sans réseau. Les seuls textes écrits dans l'app (`offline.*`) : sans
 * réseau, l'API ne peut pas les fournir.
 */
export function OfflineScreen({ onRetry, retrying }: Props) {
  const { t } = useI18n();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <BrandLogo variant="symbol" height={48} testID="offline-logo" />
        <ThemedText style={styles.message} accessibilityRole="alert" testID="offline-message">
          {t('offline.message')}
        </ThemedText>
        <Pressable
          testID="offline-retry"
          accessibilityRole="button"
          accessibilityState={{ busy: retrying, disabled: retrying }}
          disabled={retrying}
          onPress={onRetry}
          style={styles.button}>
          {retrying ? <ActivityIndicator /> : <ThemedText type="linkPrimary">{t('offline.retry')}</ThemedText>}
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  message: { textAlign: 'center' },
  button: { minHeight: 32, justifyContent: 'center' },
});
