import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/features/auth/components/Avatar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { NotificationStep } from '../types';
import { formatStamp } from '../utils/stamp';

/** Diamètre de la photo de qui a fait l'étape. */
const AVATAR_SIZE = 32;

/**
 * Le suivi d'une demande comme une conversation, sur la page d'une notification
 * (décisions 2026-11-20-suivi-demande et 2026-11-20-suivi-conversation) : ses
 * étapes, de la plus ancienne à la plus récente ; celles du membre à gauche (`start`),
 * celles du propriétaire à droite (`end`). Chacune : la photo de qui l'a faite dans un
 * petit cercle, son nom, dessous son message (à défaut le libellé de l'étape,
 * « Demande acceptée »), puis la date, alignée à droite (l'heure seule le jour même).
 * Le nom et la photo ouvrent sa page (`onOpen`). Ses propres étapes : « Toi », sans photo.
 */
export function NotificationConversation({ steps, onOpen }: { steps: NotificationStep[]; onOpen: (link: string) => void }) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const { user } = useAuth();

  if (steps.length === 0) {
    return null;
  }

  return (
    <View style={styles.block} testID="notification-history">
      {steps.map((step, index) => {
        const end = step.side === 'end';
        const mine = user !== null && step.actor !== null && step.actor.id === String(user.id);

        return (
          <View key={step.id} style={[styles.step, end && styles.stepEnd]} testID={`notification-history-${index}`}>
            {step.actor && !mine && (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={step.actor.name}
                hitSlop={Spacing.one}
                onPress={() => step.actor && onOpen(step.actor.link)}
                style={({ pressed }) => pressed && styles.pressed}
                testID={`notification-history-${index}-avatar`}>
                <Avatar user={{ initials: step.actor.initials, avatar_url: step.actor.photo }} size={AVATAR_SIZE} />
              </Pressable>
            )}
            <View style={[styles.bubble, { backgroundColor: theme.backgroundElement }]} testID={`notification-history-${index}-bubble`}>
              {mine ? (
                <ThemedText type="smallBold" testID={`notification-history-${index}-actor`}>
                  {t('notifications.you')}
                </ThemedText>
              ) : step.actor && (
                <ThemedText type="smallBold" accessibilityRole="link" onPress={() => step.actor && onOpen(step.actor.link)} testID={`notification-history-${index}-actor`}>
                  {step.actor.name}
                </ThemedText>
              )}
              <ThemedText type="small" testID={`notification-history-${index}-message`}>
                {step.message ?? step.label}
              </ThemedText>
              {step.created_at && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.date} testID={`notification-history-${index}-date`}>
                  {formatStamp(step.created_at, locale)}
                </ThemedText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.three },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, maxWidth: '85%', alignSelf: 'flex-start' },
  // Le propriétaire à droite : la photo à droite de la bulle.
  stepEnd: { flexDirection: 'row-reverse', alignSelf: 'flex-end' },
  bubble: { flexShrink: 1, gap: Spacing.half, borderRadius: 12, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  date: { textAlign: 'right' },
  pressed: { opacity: 0.7 },
});
