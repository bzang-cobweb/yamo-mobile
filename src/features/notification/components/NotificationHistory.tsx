import { StyleSheet, View } from 'react-native';

import { Quote } from '@/shared/components/Quote';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { NotificationStep } from '../types';

/**
 * Le suivi d'une demande, sur la page d'une notification (décision
 * 2026-11-20-suivi-demande) : ses étapes, de la plus ancienne à la plus récente, des
 * deux côtés. Chacune : son libellé en gras, qui, son message, sa date à droite.
 */
export function NotificationHistory({ steps }: { steps: NotificationStep[] }) {
  const { t, locale } = useI18n();
  const theme = useTheme();

  if (steps.length === 0) {
    return null;
  }

  const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <View style={styles.block} testID="notification-history">
      <ThemedText type="subtitle" style={styles.title}>
        {t('notifications.history')}
      </ThemedText>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.step} testID={`notification-history-${index}`}>
          {/* La ligne du suivi : un point par étape, relié au suivant. */}
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: theme.text }]} />
            {index < steps.length - 1 && <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />}
          </View>
          <View style={styles.texts}>
            <ThemedText type="smallBold" testID={`notification-history-${index}-label`}>
              {step.label}
            </ThemedText>
            {step.actor && (
              <ThemedText type="small" themeColor="textSecondary" testID={`notification-history-${index}-actor`}>
                {step.actor.name}
              </ThemedText>
            )}
            {step.message && <Quote text={step.message} testID={`notification-history-${index}-message`} />}
            {step.created_at && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.date} testID={`notification-history-${index}-date`}>
                {format.format(new Date(step.created_at))}
              </ThemedText>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.two, marginTop: Spacing.two },
  title: { fontSize: 18, lineHeight: 24 },
  step: { flexDirection: 'row', gap: Spacing.three },
  rail: { width: 10, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  line: { flex: 1, width: 2, marginTop: Spacing.one },
  texts: { flex: 1, gap: Spacing.one, paddingBottom: Spacing.three },
  date: { textAlign: 'right' },
});
