import { StyleSheet, View } from 'react-native';

import { StatusTag, type StatusTagValue } from '@/shared/components/StatusTag';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

/**
 * Le type d'une notification en gras (« Demande de logement ») et, dessous, le statut
 * réel de la demande (« En attente »), sur toutes ses vues : la carte, sa page, le
 * calendrier de l'offre (décision 2026-11-20-type-et-statut).
 */
export function NotificationType({ type, tag, testID }: { type: string; tag: StatusTagValue | null | undefined; testID: string }) {
  return (
    <View style={styles.block}>
      {type !== '' && (
        <ThemedText type="smallBold" testID={`${testID}-type`}>
          {type}
        </ThemedText>
      )}
      {tag && <StatusTag tag={tag} testID={`${testID}-tag`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.one },
});
