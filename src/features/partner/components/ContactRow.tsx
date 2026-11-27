import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

/** Une ligne de contact : le libellé à gauche, la valeur en lien à droite (l'e-mail, l'appel). Le partenaire et ses membres. */
export function ContactRow({ label, value, url, testID }: { label: string; value: string; url: string; testID: string }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
      <Pressable accessibilityRole="link" accessibilityLabel={`${label} ${value}`} hitSlop={Spacing.one} onPress={() => void Linking.openURL(url)} testID={testID}>
        <ThemedText style={{ color: theme.primary }}>{value}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.three },
});
