import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

/**
 * La largeur d'écran à partir de laquelle le panneau devient une colonne centrée (tablette, web) ; en dessous (un
 * téléphone), il prend toute la largeur (décision 2026-11-26-sheet-bar).
 */
export const SHEET_COLUMN_FROM = 600;

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /**
   * Faux (par défaut) : le panneau prend sa taille maximale, toute la fenêtre sous la barre d'état moins une bande
   * (décision 2026-11-26-panneaux-taille-maximale), et
   * `children` remplit la place (`flex: 1`) : un contenu qui défile le fait dans un `ScrollView` en `flex: 1`, et
   * place sous lui ce qui reste en bas. Vrai : le panneau prend la taille de son contenu, jusqu'à la taille maximale.
   */
  fitContent?: boolean;
  /** Ce qui se pose par-dessus le panneau, dans la même fenêtre (le bandeau des messages). */
  overlay?: ReactNode;
  testID?: string;
};

/**
 * Un panneau qui monte du bas (décisions 2026-11-25-filtres-en-panneau et 2026-11-26-bottom-sheet) : un fond assombri
 * qui ferme au toucher, la ligne du titre et d'une croix (« Fermer »), bordée en bas, puis `children`, sans rien
 * ajouter autour. Les filtres d'une liste, les demandes d'un jour du calendrier.
 */
export function BottomSheet(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      {/* Les marges de la fenêtre du panneau, pas celles de l'écran qui l'ouvre : sur un écran de la pile (le calendrier),
          la fenêtre du `Modal` ne commence pas en haut de l'écran (décision 2026-11-26-bottom-sheet). */}
      <SafeAreaProvider>
        <Sheet {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function Sheet({ title, onClose, children, fitContent = false, overlay = null, testID = 'bottom-sheet' }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const column = width >= SHEET_COLUMN_FROM;

  return (
    <>
      {/* Le fond assombri derrière tout le panneau : ses coins arrondis du haut se voient sur lui. Le panneau occupe
          la fenêtre réelle du `Modal`, moins une bande en haut (la barre d'état et `Spacing.four`) : une hauteur fixe
          calculée sur l'écran débordait quand la fenêtre est plus petite (le calendrier, décision 2026-11-26-bottom-sheet). */}
      <View style={[styles.root, { paddingTop: insets.top + Spacing.four }]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('nav.close')} onPress={onClose} testID={`${testID}-backdrop`} />
        <ThemedView style={[styles.sheet, column && styles.column, fitContent ? styles.sheetFit : styles.sheetFill, { paddingBottom: insets.bottom }]} testID={testID}>
          <View style={[styles.header, { borderBottomColor: theme.backgroundSelected }]} testID={`${testID}-header`}>
            <ThemedText type="smallBold" style={styles.title} accessibilityRole="header">
              {title}
            </ThemedText>
            <Pressable testID={`${testID}-close`} accessibilityRole="button" accessibilityLabel={t('nav.close')} hitSlop={Spacing.two} onPress={onClose}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} tintColor={theme.text} size={20} />
            </Pressable>
          </View>
          <View style={fitContent ? styles.fit : styles.fill} testID={`${testID}-content`}>
            {children}
          </View>
        </ThemedView>
      </View>
      {overlay}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  // Sur un grand écran, tout le panneau (titre, contenu, barre) en colonne centrée, de la largeur du contenu des écrans
  // (décision 2026-11-26-sheet-bar).
  column: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center' },
  // Taille maximale : toute la place sous la bande du haut.
  sheetFill: { flex: 1 },
  // Taille du contenu : posé en bas, il ne dépasse pas la place sous la bande du haut.
  sheetFit: { marginTop: 'auto', flexShrink: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  title: { flex: 1 },
  // Taille maximale : le contenu remplit la place.
  fill: { flex: 1 },
  // Taille du contenu : il rétrécit seulement quand il dépasse la taille maximale.
  fit: { flexShrink: 1 },
});
