import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { APP_LINK } from './NotificationText';
import type { SummaryLine } from '../types';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

/** Les lignes toujours visibles, avant « Voir plus » (décision 2026-11-21-voir-plus-apres-deux-lignes). */
const VISIBLE_LINES = 2;

/**
 * Des lignes sur la page d'une notification, sous son en-tête (décisions 2026-11-26-booking-summary et
 * 2026-11-26-partenaire-dernieres-modifications) : dans l'ordre servi, le libellé à gauche et la valeur à droite ; les
 * deux premières toujours ; « Voir plus » ouvre toutes les lignes dans un panneau qui défile (`BottomSheet`, décision
 * 2026-11-26-lignes-en-panneau), titré `title` : la zone fixe de la page garde sa hauteur, quelle que soit la longueur
 * des lignes (décisions 2026-11-20-lignes-demande et 2026-11-21-voir-plus-apres-deux-lignes). Une valeur avec un lien
 * ouvre son écran ; la ligne `total` en gras. Les lignes d'une demande (`BookingSummary`), les dernières modifications
 * d'un partenaire.
 */
export function SummaryLines({ lines, title, onOpen, testID = 'notification-detail' }: { lines: SummaryLine[]; title?: string | null; onOpen: (link: string) => void; testID?: string }) {
  const { t, locale } = useI18n();
  // Le panneau de toutes les lignes, ouvert par « Voir plus ».
  const [open, setOpen] = useState(false);
  const firstLines = lines.slice(0, VISIBLE_LINES);
  const hasMore = lines.length > VISIBLE_LINES;

  /** Ouvre l'écran d'un lien, en fermant d'abord le panneau qui le couvrirait. */
  function follow(link: string) {
    setOpen(false);
    onOpen(link);
  }

  function renderLine(line: SummaryLine, prefix: string) {
    return (
      <View key={line.key} style={styles.line} testID={`${prefix}-line-${line.key}`}>
        <ThemedText
          type={line.key === 'total' ? 'smallBold' : 'small'}
          themeColor={line.key === 'total' ? undefined : 'textSecondary'}
          testID={`${prefix}-line-${line.key}-label`}>
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
            onPress={() => line.link && follow(line.link)}
            style={styles.value}
            testID={`${prefix}-line-${line.key}-value`}>
            {line.value}
          </ThemedText>
        ) : (
          <ThemedText
            type="small"
            themeColor={line.key === 'total' ? undefined : 'textSecondary'}
            style={[styles.value, line.key === 'total' && styles.total]}
            selectable
            testID={`${prefix}-line-${line.key}-value`}>
            {line.value}
          </ThemedText>
        )}
      </View>
    );
  }

  return (
    <>
      {firstLines.map((line) => renderLine(line, testID))}
      {/* À droite, sans icône : « Voir plus » ouvre le panneau de toutes les lignes (décisions
          2026-11-21-detail-reservation-voir-plus et 2026-11-26-lignes-en-panneau). */}
      {hasMore && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          testID={`${testID}-more`}>
          <ThemedText type="linkPrimary" testID={`${testID}-more-label`}>
            {t('notifications.more')}
          </ThemedText>
        </Pressable>
      )}
      {hasMore && (
        <BottomSheet visible={open} title={title || t('notifications.details')} onClose={() => setOpen(false)} testID={`${testID}-sheet`}>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody}>
            {lines.map((line) => renderLine(line, `${testID}-sheet`))}
          </ScrollView>
        </BottomSheet>
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
  sheetScroll: { flex: 1 },
  sheetBody: { gap: Spacing.three, padding: Spacing.four },
  more: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-end' },
  pressed: { opacity: 0.7 },
});
