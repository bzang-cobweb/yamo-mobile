import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { useBack, useCurrentFormStep } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

type Props = {
  /** Titre de l'écran, affiché au centre (« Créer un compte »). */
  title: string;
  /** Ce qui se pose à droite (le menu « ⋮ » d'une notification, décision 2026-11-27-notification-menu-info). */
  right?: ReactNode;
};

/**
 * En-tête d'un sous-écran, fixé en haut comme le menu du bas l'est en bas : la flèche
 * de retour à gauche, le titre au centre ; le contenu défile dessous. Une croix à droite seulement
 * dans un formulaire à étapes, à partir de la 2e étape : elle ferme la page (décision
 * 2026-11-26-croix-etapes-seulement). La flèche revient
 * à l'étape précédente d'un formulaire à étapes, sinon à l'écran précédent
 * (`BackStackProvider`). Le placer hors du `ScrollView`.
 */
export function BackHeader({ title, right }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const back = useBack();
  // La croix : seulement dans un formulaire à étapes, à partir de la 2e ; elle ferme sa page (décision
  // 2026-11-26-croix-etapes-seulement).
  const formStep = useCurrentFormStep();
  const closable = formStep !== null && formStep >= 1;

  return (
    <View
      testID="back-header"
      style={[styles.bar, { backgroundColor: theme.background, borderBottomColor: theme.backgroundSelected }]}>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.title} accessibilityRole="header" testID="back-header-title">
        {title}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('nav.back')}
        testID="back-header-link"
        onPress={back}
        hitSlop={12}
        style={styles.back}>
        <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={20} tintColor={theme.text} />
      </Pressable>
      {right && !closable && <View style={styles.right}>{right}</View>}
      {closable && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nav.close')}
          testID="back-header-close"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.close}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} tintColor={theme.text} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    // Au-dessus du contenu : le menu « ⋮ » ouvert déborde dessous.
    zIndex: 3,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Centré sur toute la largeur, avec une marge pour ne jamais passer sous la flèche.
  title: { position: 'absolute', left: 56, right: 56, textAlign: 'center' },
  back: { position: 'absolute', left: Spacing.three, padding: Spacing.one },
  close: { position: 'absolute', right: Spacing.three, padding: Spacing.one },
  right: { position: 'absolute', right: Spacing.three, top: 10, zIndex: 3 },
});
