import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { useBack, useClose, useCurrentFormStep } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

type Props = {
  /** Titre de l'écran, affiché au centre (« Créer un compte »). */
  title: string;
  /** `false` : jamais de croix, la flèche seule (la liste des avis, décision 2026-11-25-liste-avis-titre-nombre). */
  closable?: boolean;
};

/**
 * En-tête d'un sous-écran, fixé en haut comme le menu du bas l'est en bas : la flèche
 * de retour à gauche, le titre au centre, et une croix à droite quand on est à plus
 * d'un écran du départ (elle y ramène d'un coup) ; le contenu défile dessous. La flèche revient
 * à l'étape précédente d'un formulaire à étapes, sinon à l'écran précédent
 * (`BackStackProvider`). Le placer hors du `ScrollView`.
 */
export function BackHeader({ title, closable = true }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const back = useBack();
  const deep = useClose();
  // Un formulaire à étapes : la croix ferme sa page, à partir de la 2e étape seulement (décision 2026-11-25-croix-formulaire-etapes) ; sinon, plus d'un
  // écran depuis le départ, elle y ramène d'un coup.
  const formStep = useCurrentFormStep();
  const close = formStep === null ? deep : formStep >= 1 ? () => router.back() : null;

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
      {/* Plus d'un écran depuis le départ : la croix y ramène d'un coup. */}
      {closable && close && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nav.close')}
          testID="back-header-close"
          onPress={close}
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
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Centré sur toute la largeur, avec une marge pour ne jamais passer sous la flèche.
  title: { position: 'absolute', left: 56, right: 56, textAlign: 'center' },
  back: { position: 'absolute', left: Spacing.three, padding: Spacing.one },
  close: { position: 'absolute', right: Spacing.three, padding: Spacing.one },
});
