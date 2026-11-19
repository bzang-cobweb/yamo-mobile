import { Pressable, StyleSheet, View } from 'react-native';

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
 * La photo et le nom ouvrent sa page. Sans qui agit (ancienne notification) : le
 * titre à la place du nom.
 */
export function NotificationActor({ actor, title, date, onOpen, testID }: { actor: Actor | null | undefined; title: string; date: string; onOpen: (link: string) => void; testID: string }) {
  return (
    <View style={styles.head}>
      {actor && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={actor.name}
          hitSlop={Spacing.one}
          onPress={() => onOpen(actor.link)}
          style={({ pressed }) => [styles.ring, { borderColor: actor.online ? TONE_COLORS.success : 'transparent' }, pressed && styles.pressed]}
          testID={`${testID}-avatar${actor.online ? '-online' : ''}`}>
          <Avatar user={{ initials: actor.initials, avatar_url: actor.photo }} size={AVATAR_SIZE} />
        </Pressable>
      )}
      <View style={styles.texts}>
        {actor ? (
          <ThemedText type="smallBold" accessibilityRole="link" testID={`${testID}-actor`} onPress={() => onOpen(actor.link)}>
            {actor.name}
          </ThemedText>
        ) : (
          <ThemedText type="smallBold">{title}</ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary" testID={`${testID}-date`}>
          {date}
        </ThemedText>
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
