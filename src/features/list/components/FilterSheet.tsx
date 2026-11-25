import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { FilterForm } from '../screens/FilterScreen';

/**
 * Les filtres d'une liste dans un panneau qui monte du bas, comme les demandes d'un jour du calendrier (décision
 * 2026-11-25-filtres-en-panneau) : un fond assombri qui ferme au toucher, le titre « Filtres » et une croix pour fermer, sur une ligne bordée en bas, les champs
 * qui défilent, puis « Effacer » et « Appliquer ». Les champs repartent des filtres en cours à chaque ouverture.
 */
export function FilterSheet({ list, visible, onClose }: { list: string; visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  // 80 % de l'écran au plus : un pourcentage se calcule sur le parent, plus haut que l'écran dans une fenêtre présentée.
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Le fond assombri derrière tout le panneau : ses coins arrondis du haut se voient sur lui (décision
          2026-11-25-filtres-en-panneau). */}
      <View style={styles.root}>
        <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel={t('nav.close')} onPress={onClose} testID="filter-sheet-backdrop" />
        <ThemedView style={[styles.sheet, { maxHeight: height * 0.8, paddingBottom: insets.bottom }]} testID="filter-sheet">
          {/* Une bordure sous la ligne « Filtres » (décision 2026-11-25-filtres-en-panneau). */}
          <View style={[styles.header, { borderBottomColor: theme.backgroundSelected }]} testID="filter-sheet-header">
            <ThemedText type="smallBold" style={styles.title} accessibilityRole="header">
              {t('list.filters')}
            </ThemedText>
            {/* Une croix, lue « Fermer » (décision 2026-11-25-filtres-en-panneau). */}
            <Pressable testID="filter-sheet-close" accessibilityRole="button" accessibilityLabel={t('nav.close')} hitSlop={Spacing.two} onPress={onClose}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} tintColor={theme.text} size={20} />
            </Pressable>
          </View>
          {/* Monté à l'ouverture seulement : les champs partent des filtres en cours. */}
          {visible && <FilterForm list={list} onDone={onClose} />}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
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
});
