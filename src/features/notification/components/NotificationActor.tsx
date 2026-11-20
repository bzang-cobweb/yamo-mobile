import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/features/auth/components/Avatar';
import { TONE_COLORS } from '@/shared/components/StatusTag';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import type { NotificationActor as Actor } from '../types';

/** Diamètre de la photo de qui agit. */
const AVATAR_SIZE = 52;

/**
 * L'en-tête d'une notification (décision 2026-11-19-carte-notification), le même
 * sur la carte et sur la page :
 * - la photo de qui agit, cerclée de vert s'il est en ligne ;
 * - à côté, son nom, et la date dessous.
 *
 * La photo et le nom ouvrent sa page, si l'écran le permet (`onOpen`). Sans qui agit (ancienne notification) :
 * la date seule (le type est dessous, `NotificationType`).
 */
export function NotificationActor({
  actor,
  date,
  onOpen,
  testID,
  contact = false,
}: {
  actor: Actor | null | undefined;
  /** Sous le nom ; `null` : pas de date ici (la page la met après le message). */
  date: string | null;
  /** Ouvre la page de qui agit (photo, nom) ; absent : ni la photo ni le nom ne sont cliquables. */
  onOpen?: (link: string) => void;
  testID: string;
  /** Sous le nom, l'e-mail et le téléphone de qui agit (la page d'une notification). */
  contact?: boolean;
}) {
  return (
    <View style={styles.head}>
      {actor &&
        (onOpen ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={actor.name}
            hitSlop={Spacing.one}
            onPress={() => onOpen(actor.link)}
            style={({ pressed }) => [styles.ring, { borderColor: actor.online ? TONE_COLORS.success : 'transparent' }, pressed && styles.pressed]}
            testID={`${testID}-avatar${actor.online ? '-online' : ''}`}>
            <Avatar user={{ initials: actor.initials, avatar_url: actor.photo }} size={AVATAR_SIZE} />
          </Pressable>
        ) : (
          // Sans lien : une simple vue, l'appui revient à la carte (sa page).
          <View style={[styles.ring, { borderColor: actor.online ? TONE_COLORS.success : 'transparent' }]} testID={`${testID}-avatar${actor.online ? '-online' : ''}`}>
            <Avatar user={{ initials: actor.initials, avatar_url: actor.photo }} size={AVATAR_SIZE} />
          </View>
        ))}
      <View style={styles.texts}>
        {actor && (
          <ThemedText type="smallBold" accessibilityRole={onOpen ? 'link' : undefined} testID={`${testID}-actor`} onPress={onOpen ? () => onOpen(actor.link) : undefined}>
            {actor.name}
          </ThemedText>
        )}
        {contact && actor?.email && (
          <ThemedText type="small" themeColor="textSecondary" accessibilityRole="link" testID={`${testID}-email`} onPress={() => void Linking.openURL(`mailto:${actor.email}`)}>
            {actor.email}
          </ThemedText>
        )}
        {contact && actor?.phone && (
          <ThemedText type="small" themeColor="textSecondary" accessibilityRole="link" testID={`${testID}-phone`} onPress={() => void Linking.openURL(`tel:${actor.phone?.replace(/\s/g, '')}`)}>
            {actor.phone}
          </ThemedText>
        )}
        {date !== null && (
          <ThemedText type="small" themeColor="textSecondary" testID={`${testID}-date`}>
            {date}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  texts: { flex: 1, gap: 2 },
  ring: { borderWidth: 2, borderRadius: (AVATAR_SIZE + 8) / 2, padding: 2 },
  pressed: { opacity: 0.7 },
});
