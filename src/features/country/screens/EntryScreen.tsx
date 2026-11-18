import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocaleSwitcher } from '@/features/welcome/components/LocaleSwitcher';
import { useApplication } from '@/features/welcome/hooks/useApplication';
import { BrandLogo } from '@/shared/brand/BrandLogo';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { EntrySelect } from '../components/EntrySelect';
import { useCountry } from '../context/CountryContext';
import type { Country } from '../types';

// Même logo et même place que l'accueil.
const LOGO_HEIGHT = 160;

/**
 * Écran d'entrée (décisions 2026-11-18-espace-pays, 2026-11-18-ecran-entree-toujours
 * et 2026-11-18-ecran-entree-selecteurs) : le sélecteur de langue de l'accueil,
 * à la même place (invité seulement : connecté, c'est celle du compte), le logo,
 * la description de l'application, puis le sélecteur de pays, avec recherche.
 * Un pays seul est montré choisi. « Entrer » garde la langue et le pays :
 * l'écran ne revient plus ; ensuite, la barre du haut permet d'en changer.
 */
export function EntryScreen({ showLanguage }: { showLanguage: boolean }) {
  const { t, locale, chooseLocale } = useI18n();
  const theme = useTheme();
  const { countries, chosen, enter } = useCountry();
  const { data: application, isPending } = useApplication();
  const [selected, setSelected] = useState<string | null>(() => chosen?.code ?? (countries.length === 1 ? countries[0].code : null));
  const choice = countries.length === 1 ? countries[0].code : selected;

  function submit() {
    if (choice === null) {
      return;
    }

    // La langue affichée devient un choix gardé, comme le pays.
    if (showLanguage) {
      chooseLocale(locale);
    }
    enter(choice);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="entry-screen">
          <View style={styles.presentation}>
            {showLanguage && <LocaleSwitcher style={styles.localeSwitcher} />}
            <BrandLogo variant="vertical" height={LOGO_HEIGHT} testID="entry-logo" />
            {isPending && <ActivityIndicator testID="entry-loading" />}
            {application?.description && (
              <ThemedText themeColor="textSecondary" style={styles.centered} testID="entry-description">
                {application.description}
              </ThemedText>
            )}
          </View>

          <View style={styles.fields}>
            <EntrySelect
              testID="entry-country"
              label={t('entry.country')}
              placeholder={t('entry.chooseCountry')}
              options={countries.map((country) => ({ value: country.code, label: `${country.flag}  ${countryLabel(country)}` }))}
              selected={choice}
              onSelect={setSelected}
              searchable
            />
            <Pressable
              testID="entry-enter"
              accessibilityRole="button"
              accessibilityState={{ disabled: choice === null }}
              disabled={choice === null}
              onPress={submit}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary },
                choice === null && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={{ color: theme.onPrimary }}>{t('entry.enter')}</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** « Cameroun », ou « Allemagne (Deutschland) » quand le nom natif diffère. */
function countryLabel(country: Country): string {
  return country.native_name && country.native_name !== country.name ? `${country.name} (${country.native_name})` : country.name;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
  // Logo et description au centre de l'espace libre ; les sélecteurs en bas.
  presentation: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three },
  centered: { textAlign: 'center' },
  // Comme sur l'accueil : un peu d'air entre la langue et le logo.
  localeSwitcher: { marginBottom: Spacing.four },
  fields: { gap: Spacing.three },
  button: { alignItems: 'center', borderRadius: 8, paddingVertical: Spacing.three, marginTop: Spacing.two },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
