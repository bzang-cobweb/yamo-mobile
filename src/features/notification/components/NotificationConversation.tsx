import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { TONE_COLORS } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { NotificationStep } from '../types';
import { formatStamp } from '../utils/stamp';

/**
 * Le suivi d'une demande comme une conversation, sur la page d'une notification
 * (décisions 2026-11-20-suivi-demande et 2026-11-20-suivi-conversation) : ses
 * étapes, de la plus ancienne à la plus récente. Celles du lecteur à droite, nommées
 * « Toi » ; celles de l'autre partie à gauche, avec son nom, sans photo (décision
 * 2026-11-21-conversation-sans-photo). Dessous, le message (à défaut le libellé de l'étape,
 * « Demande acceptée »), puis la date, alignée à droite (l'heure seule le jour même).
 * Le nom de l'autre ouvre sa page (`onOpen`). Après la date d'une étape
 * du lecteur, des coches (décision 2026-11-20-coches-lecture) : une grise, l'autre ne
 * s'est pas connecté depuis ; deux grises, connecté sans l'avoir lue ; deux vertes, lue.
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
        const mine = user !== null && step.actor !== null && step.actor.id === String(user.id);

        return (
          <View key={step.id} style={[styles.step, mine && styles.stepMine]} testID={`notification-history-${index}`}>
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
              {(step.created_at || (mine && step.delivery)) && (
                <View style={styles.footer}>
                  {step.created_at && (
                    <ThemedText type="small" themeColor="textSecondary" testID={`notification-history-${index}-date`}>
                      {formatStamp(step.created_at, locale)}
                    </ThemedText>
                  )}
                  {mine && step.delivery && <Ticks delivery={step.delivery} color={theme.textSecondary} testID={`notification-history-${index}-delivery`} />}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Une coche (envoyée), deux (remise), deux vertes (lue). */
function Ticks({ delivery, color, testID }: { delivery: 'sent' | 'delivered' | 'read'; color: string; testID: string }) {
  const { t } = useI18n();
  const tint = delivery === 'read' ? TONE_COLORS.success : color;
  const check = { ios: 'checkmark', android: 'check', web: 'check' } as const;

  return (
    <View style={styles.ticks} accessible accessibilityLabel={t(`notifications.delivery.${delivery}`)} testID={`${testID}-${delivery}`}>
      <SymbolView name={check} size={12} tintColor={tint} weight="bold" />
      {delivery !== 'sent' && <SymbolView name={check} size={12} tintColor={tint} weight="bold" style={styles.second} />}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.three },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, maxWidth: '85%', alignSelf: 'flex-start' },
  // Le lecteur à droite.
  stepMine: { alignSelf: 'flex-end' },
  bubble: { flexShrink: 1, gap: Spacing.half, borderRadius: 12, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  // La date à droite, les coches après.
  footer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.one },
  ticks: { flexDirection: 'row' },
  // La seconde coche chevauche la première.
  second: { marginLeft: -6 },
});
