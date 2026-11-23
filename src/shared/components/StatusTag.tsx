import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ERROR_COLOR } from '@/shared/theme/colors';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

/**
 * Une pastille de statut servie par l'API : son texte, son ton, et `on_image` quand elle va sur la
 * photo, à la place du cœur (décision 2026-11-21-statut-a-la-place-du-coeur).
 */
export type StatusTagValue = { label: string; tone: string; on_image?: boolean };

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
export function StatusTag({ tag, style, testID }: { tag: StatusTagValue; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: TONE_COLORS[tag.tone] ?? TONE_COLORS.neutral }, style]} testID={testID}>
      <ThemedText type="smallBold" style={styles.text}>
        {tag.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 10 },
  text: { color: '#ffffff' },
  // Sur une photo, en haut à droite, à la place du cœur de favori.
  onImage: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  // Sur une photo, en haut à gauche : le haut à droite porte le menu de la carte (décision 2026-11-21-menu-en-haut-a-droite).
  onImageLeft: { position: 'absolute', top: Spacing.two, left: Spacing.two },
});

/** La place d'une pastille sur une photo : celle du cœur de favori. */
export const STATUS_ON_IMAGE = styles.onImage;

/** La place d'une pastille sur une photo dont le haut à droite porte le menu de la carte. */
export const STATUS_ON_IMAGE_LEFT = styles.onImageLeft;
