import { StyleSheet, View } from 'react-native';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

/** Une pastille de statut servie par l'API : son texte et son ton. */
export type StatusTagValue = { label: string; tone: string };

/** Les couleurs des pastilles de statut : en attente orange, acceptée verte, refusée rouge, sinon gris. */
export const TONE_COLORS: Record<string, string> = {
  warning: '#E8890C',
  success: '#2E9D5B',
  danger: ERROR_COLOR,
  neutral: '#8A8F98',
};

/**
 * La pastille de couleur d'un statut (une demande, une annonce), la même dans les
 * listes du profil et dans les notifications.
 */
export function StatusTag({ tag, testID }: { tag: StatusTagValue; testID?: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: TONE_COLORS[tag.tone] ?? TONE_COLORS.neutral }]} testID={testID}>
      <ThemedText type="smallBold" style={styles.text}>
        {tag.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 10 },
  text: { color: '#ffffff' },
});
