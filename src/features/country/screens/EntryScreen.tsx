import { useQuery } from '@tanstack/react-query';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/shared/brand/BrandLogo';
import { useI18n } from '@/shared/i18n/I18nContext';
import { localeService } from '@/shared/services/LocaleService';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useCountry } from '../context/CountryContext';
import type { Country } from '../types';

const LOGO_HEIGHT = 96;

/**
 * Écran d'entrée, toujours affiché au premier lancement et rouvert par le drapeau
 * (décisions 2026-11-18-espace-pays et 2026-11-18-ecran-entree-toujours) : la
 * langue (invité seulement : connecté, c'est celle du compte), puis le pays. Un
 * pays seul est montré choisi, sans autre choix. « Entrer » ouvre l'app dans ce pays.
 */
export function EntryScreen({ showLanguage }: { showLanguage: boolean }) {
  const { t, locale, chooseLocale } = useI18n();
  const theme = useTheme();
  const { countries, enter } = useCountry();
  const { data: locales } = useQuery({ queryKey: ['locales'], queryFn: () => localeService.list(), staleTime: Infinity, enabled: showLanguage });
  const [selected, setSelected] = useState<string | null>(() => (countries.length === 1 ? countries[0].code : null));
  const choice = countries.length === 1 ? countries[0].code : selected;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} testID="entry-screen">
          <View style={styles.header}>
            <BrandLogo variant="vertical" height={LOGO_HEIGHT} testID="entry-logo" />
            <ThemedText type="subtitle">{t('entry.title')}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              {t('entry.subtitle')}
            </ThemedText>
          </View>

          {showLanguage && (
            <View style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('entry.language')}
              </ThemedText>
              {!locales && <ActivityIndicator />}
              {locales?.data.map((option) => (
                <Option
                  key={option.code}
                  testID={`entry-locale-${option.code}`}
                  label={option.label}
                  selected={option.code === locale}
                  disabled={locales.data.length === 1}
                  onPress={() => chooseLocale(option.code)}
                />
              ))}
            </View>
          )}

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('entry.country')}
            </ThemedText>
            {countries.map((country) => (
              <Option
                key={country.code}
                testID={`entry-country-${country.code}`}
                flag={country.flag}
                label={countryLabel(country)}
                selected={country.code === choice}
                disabled={countries.length === 1}
                onPress={() => setSelected(country.code)}
              />
            ))}
          </View>

          <Pressable
            testID="entry-enter"
            accessibilityRole="button"
            disabled={choice === null}
            onPress={() => choice && enter(choice)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.primary },
              choice === null && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <ThemedText style={{ color: theme.onPrimary }}>{t('entry.enter')}</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** « Cameroun », ou « Allemagne (Deutschland) » quand le nom natif diffère. */
function countryLabel(country: Country): string {
  return country.native_name && country.native_name !== country.name ? `${country.name} (${country.native_name})` : country.name;
}

function Option({
  label,
  flag,
  selected,
  disabled,
  onPress,
  testID,
}: {
  label: string;
  flag?: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: theme.backgroundElement, borderColor: selected ? theme.primary : 'transparent' },
        pressed && styles.pressed,
      ]}>
      {flag && <ThemedText style={styles.flag}>{flag}</ThemedText>}
      <ThemedText style={styles.optionLabel}>{label}</ThemedText>
      {selected && (
        <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={16} tintColor={theme.primary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
  header: { alignItems: 'center', gap: Spacing.two },
  centered: { textAlign: 'center' },
  section: { gap: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  flag: { fontSize: 24 },
  optionLabel: { flex: 1 },
  button: { alignItems: 'center', borderRadius: 8, paddingVertical: Spacing.three },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
