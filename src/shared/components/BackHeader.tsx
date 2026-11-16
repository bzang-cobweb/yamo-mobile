import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

type Props = {
  /** Titre de l'écran de départ (« Profil », « Se connecter »). */
  label: string;
  /** Par défaut : écran précédent. */
  onPress?: () => void;
};

/**
 * En-tête de retour, fixé en haut d'un sous-écran comme le menu du bas l'est en bas :
 * il reste en place et le contenu défile dessous. Le placer hors du `ScrollView`.
 */
export function BackHeader({ label, onPress = () => router.back() }: Props) {
  const theme = useTheme();

  return (
    <View
      testID="back-header"
      style={[styles.bar, { backgroundColor: theme.background, borderBottomColor: theme.backgroundSelected }]}>
      <Pressable accessibilityRole="link" testID="back-header-link" onPress={onPress} hitSlop={8} style={styles.inner}>
        <ThemedText type="linkPrimary">← {label}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
