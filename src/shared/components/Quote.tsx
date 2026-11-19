import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

/**
 * Un message saisi par un utilisateur (celui d'un membre avec sa demande, le motif
 * d'un refus), cité en italique avec un filet à gauche : sur une carte de liste
 * comme dans une notification.
 */
export function Quote({ text, testID }: { text: string; testID?: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.quote, { borderColor: theme.backgroundSelected }]} testID={testID}>
      <ThemedText type="small" style={styles.text}>
        « {text} »
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  quote: { borderLeftWidth: 3, paddingLeft: Spacing.two },
  text: { fontStyle: 'italic' },
});
