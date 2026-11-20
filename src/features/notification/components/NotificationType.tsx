import { StyleSheet, View } from 'react-native';

import { StatusTag, type StatusTagValue } from '@/shared/components/StatusTag';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

/**
 * Le type d'une notification en gras (« Demande de logement ») et, en haut à droite,
 * la pastille du statut réel de la demande (« En attente »), sur toutes ses vues : la
 * carte, sa page, le calendrier de l'offre (décisions 2026-11-20-type-et-statut et
 * 2026-11-20-statut-en-haut-a-droite).
 */
export function NotificationType({ type, tag, testID }: { type: string; tag: StatusTagValue | null | undefined; testID: string }) {
  return (
    <View style={styles.row}>
      {/* Toujours là, même vide : la pastille reste à droite. */}
      <ThemedText type="smallBold" style={styles.type} testID={`${testID}-type`}>
        {type}
      </ThemedText>
      {tag && <StatusTag tag={tag} testID={`${testID}-tag`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  type: { flex: 1 },
});
