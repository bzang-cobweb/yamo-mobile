import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { useBack } from '@/shared/navigation/BackStack';
import { Spacing } from '@/shared/theme/theme';

/**
 * Le retour d'un écran sans barre du haut (la fiche d'une offre, décision 2026-11-25-fiche-sans-barre) : une flèche dans
 * un rond blanc, en haut à gauche, par-dessus le contenu ; sans croix de fermeture (décision
 * 2026-11-25-fiche-sans-croix). À placer dans un parent `position: relative` qui couvre l'écran.
 */
export function FloatingBack() {
  const { t } = useI18n();
  const back = useBack();

  return (
    <View style={styles.row} pointerEvents="box-none" testID="floating-back">
      <Pressable accessibilityRole="button" accessibilityLabel={t('nav.back')} testID="floating-back-link" onPress={back} hitSlop={8} style={styles.button}>
        <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={18} tintColor="#000000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', top: Spacing.three, left: Spacing.three, zIndex: 2 },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
