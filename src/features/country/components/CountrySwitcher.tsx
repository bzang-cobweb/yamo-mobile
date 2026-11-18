import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { OptionsModal } from '@/features/form/components/fields/OptionsModal';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';

import { useCountry } from '../context/CountryContext';

/**
 * Drapeau du pays courant, dans la barre du haut (décision
 * 2026-11-18-accueil-offres-du-pays) : il ouvre directement la liste des pays,
 * avec recherche ; en choisir un autre change d'espace. Un seul pays ouvert : le
 * drapeau seul, sans liste.
 */
export function CountrySwitcher() {
  const { t } = useI18n();
  const theme = useTheme();
  const { country, countries, canChange, enter } = useCountry();
  const [open, setOpen] = useState(false);

  if (!country) {
    return null;
  }

  return (
    <>
      <Pressable
        testID="country-switcher"
        accessibilityRole="button"
        accessibilityLabel={canChange ? `${t('entry.changeCountry')} (${country.name})` : country.name}
        accessibilityState={{ disabled: !canChange }}
        disabled={!canChange}
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        <ThemedText style={styles.flag}>{country.flag}</ThemedText>
        {canChange && (
          <SymbolView name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={12} tintColor={theme.textSecondary} />
        )}
      </Pressable>
      <OptionsModal
        visible={open}
        title={t('entry.country')}
        options={countries.map((option) => ({ value: option.code, label: `${option.flag}  ${option.name}` }))}
        selected={country.code}
        onSelect={enter}
        onClose={() => setOpen(false)}
        searchable
        testIDPrefix="country-switcher"
      />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flag: { fontSize: 22, lineHeight: 28 },
  pressed: { opacity: 0.6 },
});
