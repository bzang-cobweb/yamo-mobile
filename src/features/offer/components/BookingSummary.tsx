import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { APP_LINK } from '@/features/notification/components/NotificationText';
import type { BookingLine, NotificationBooking } from '@/features/notification/types';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

/** Les lignes d'une demande toujours visibles, avant « Voir plus » (décision 2026-11-21-voir-plus-apres-deux-lignes). */
const VISIBLE_LINES = 2;

/**
 * Ce qui est propre à une demande sur la page d'une notification de son fil (décision 2026-11-26-booking-summary) :
 * ses lignes, dans l'ordre servi, le libellé à gauche et la valeur à droite ; les deux premières toujours, puis « Voir
 * plus » déplie la suite : coordonnées, dates, durée, prix, total en gras (décisions 2026-11-20-lignes-demande,
 * 2026-11-21-detail-reservation-voir-plus et 2026-11-21-voir-plus-apres-deux-lignes). Le nom du logement et son titre
 * composé ne sont pas ici : ils sont l'en-tête de la page (`heading`).
 */
export function BookingSummary({ booking, onOpen, testID = 'notification-detail' }: { booking: NotificationBooking; onOpen: (link: string) => void; testID?: string }) {
  const { t, locale } = useI18n();
  // Les lignes fermées d'abord ; « Voir plus » les déplie, « Voir moins » les replie.
  const [open, setOpen] = useState(false);
  const firstLines = booking.lines.slice(0, VISIBLE_LINES);
  const moreLines = booking.lines.slice(VISIBLE_LINES);

  function renderLine(line: BookingLine) {
    return (
      <View key={line.key} style={styles.line} testID={`${testID}-line-${line.key}`}>
        <ThemedText
          type={line.key === 'total' ? 'smallBold' : 'small'}
          themeColor={line.key === 'total' ? undefined : 'textSecondary'}
          testID={`${testID}-line-${line.key}-label`}>
          {/* « Arrivée : » ; en français, une espace insécable avant les deux-points (décision
              2026-11-22-detail-libelles-deux-points). */}
          {`${line.label}${locale.startsWith('fr') ? ' :' : ':'}`}
        </ThemedText>
        {/* Une valeur avec un lien : le nom de l'hôte ou du membre, vers sa page
            (décision 2026-11-21-detail-reservation-contact). */}
        {line.link && APP_LINK.test(line.link) ? (
          <ThemedText
            type="linkPrimary"
            accessibilityRole="link"
            onPress={() => line.link && onOpen(line.link)}
            style={styles.value}
            testID={`${testID}-line-${line.key}-value`}>
            {line.value}
          </ThemedText>
        ) : (
          <ThemedText
            type="small"
            themeColor={line.key === 'total' ? undefined : 'textSecondary'}
            style={[styles.value, line.key === 'total' && styles.total]}
            selectable
            testID={`${testID}-line-${line.key}-value`}>
            {line.value}
          </ThemedText>
        )}
      </View>
    );
  }

  return (
    <>
      {firstLines.map(renderLine)}
      {open && moreLines.map(renderLine)}
      {/* À la fin, même dépliée, à droite, sans icône : « Voir plus » / « Voir moins »
          (décision 2026-11-21-detail-reservation-voir-plus). */}
      {moreLines.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          testID={`${testID}-more`}>
          <ThemedText type="linkPrimary" testID={`${testID}-more-label`}>
            {t(open ? 'notifications.less' : 'notifications.more')}
          </ThemedText>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Le libellé en haut de sa ligne, même si la valeur en prend plusieurs (décision 2026-11-22-detail-libelle-en-haut).
  line: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  // La valeur à droite de son libellé, sur plusieurs lignes au besoin.
  value: { flexShrink: 1, textAlign: 'right' },
  total: { fontWeight: '700' },
  more: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-end' },
  pressed: { opacity: 0.7 },
});
