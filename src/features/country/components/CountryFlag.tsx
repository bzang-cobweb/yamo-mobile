import { Pressable, StyleSheet } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';

import { useCountry } from '../context/CountryContext';

/**
 * Drapeau du pays courant, seul (décision 2026-11-18-espace-pays). Plusieurs pays
 * ouverts : le toucher rouvre l'écran d'entrée ; un seul : simple rappel.
 */
export function CountryFlag() {
  const { t } = useI18n();
  const { country, canChange, reopen } = useCountry();

  if (!country) {
    return null;
  }

  return (
    <Pressable
      testID="country-flag"
      accessibilityRole={canChange ? 'button' : 'image'}
      accessibilityLabel={canChange ? `${t('entry.changeCountry')} (${country.name})` : country.name}
      disabled={!canChange}
      hitSlop={8}
      onPress={reopen}>
      <ThemedText style={styles.flag}>{country.flag}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flag: { fontSize: 22, lineHeight: 28 },
});
