import { Linking, StyleSheet, View } from 'react-native';

import { APP_LINK } from './NotificationText';
import type { SummaryLine } from '../types';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

/** Un lien d'appel ou d'e-mail, ouvert par le système. */
const CONTACT_LINK = /^(tel|mailto):/;

/**
 * Une ligne : le libellé à gauche (« Arrivée : »), la valeur à droite, en lien vers sa page s'il y en a un ; la ligne
 * `total` en gras. Les lignes d'une notification, dans son panneau « Info » (décisions 2026-11-27-notification-menu-info
 * et 2026-11-27-detail-sans-zone-fixe).
 */
export function SummaryLineRow({ line, onOpen, testID: prefix }: { line: SummaryLine; onOpen: (link: string) => void; testID: string }) {
  const { locale } = useI18n();

  return (
    <View style={styles.line} testID={`${prefix}-line-${line.key}`}>
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
      {/* Un téléphone ou un e-mail affiché masqué : le lien appelle ou écrit à la vraie valeur (décision
          2026-11-27-email-telephone-masques). */}
      {line.link && CONTACT_LINK.test(line.link) ? (
        <ThemedText
          type="linkPrimary"
          accessibilityRole="link"
          onPress={() => line.link && void Linking.openURL(line.link)}
          style={styles.value}
          testID={`${prefix}-line-${line.key}-value`}>
          {line.value}
        </ThemedText>
      ) : line.link && APP_LINK.test(line.link) ? (
        <ThemedText
          type="linkPrimary"
          accessibilityRole="link"
          onPress={() => line.link && onOpen(line.link)}
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

const styles = StyleSheet.create({
  // Le libellé en haut de sa ligne, même si la valeur en prend plusieurs (décision 2026-11-22-detail-libelle-en-haut).
  line: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  // La valeur à droite de son libellé, sur plusieurs lignes au besoin.
  value: { flexShrink: 1, textAlign: 'right' },
  total: { fontWeight: '700' },
});
