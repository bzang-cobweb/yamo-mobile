import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/features/form/components/FormField';
import type { FieldValue, FormFieldDefinition, FormValues } from '@/features/form/types';
import { dependentOptions, initialValue, isVisible } from '@/features/form/utils/values';
import { BackHeader } from '@/shared/components/BackHeader';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { fixedValues, isFixedFilter, setFilterValues, useListFilters } from '../utils/filters';

/**
 * Les filtres d'une liste (`/filters/[list]`, décision 2026-11-19-contrat-filtres-vitrine) :
 * les champs servis par l'API, préremplis avec les filtres en cours, qui défilent ; un
 * champ conditionnel ne s'affiche (et ne s'applique) que si sa condition est remplie ;
 * en bas, dans une barre fixe (décision 2026-11-19-contrat-multiselect-intervalle-equipements),
 * « Appliquer les filtres » les applique et « Effacer les filtres » les remet à zéro,
 * puis retour à la liste. Un filtre invalide est ignoré par l'API.
 */
/**
 * Une liste déroulante de filtre commence par « Tous » (aucun filtre), choisi tant
 * qu'on n'a rien choisi : même une liste d'une seule option n'est plus imposée.
 */
function withAll(field: FormFieldDefinition, label: string): FormFieldDefinition {
  if (field.type !== 'select' || field.options.some((option) => option.value === '')) {
    return field;
  }

  return { ...field, default: null, options: [{ value: '', label }, ...field.options] };
}

export function FilterScreen({ list }: { list: string }) {
  const { t } = useI18n();
  const theme = useTheme();
  const { fields, values: current } = useListFilters(list);
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(fields.map((field): [string, FieldValue] => [field.name, current[field.name] ?? initialValue(withAll(field, ''))])),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  // Seuls les filtres dont la condition est remplie s'affichent (« Logement » pour un type de demande) ; une liste
  // dépendante ne propose que les options du choix parent (« Statut » : ceux du type, décision
  // 2026-11-24-notifications-types-groupes-statut).
  const visibleFields = fields
    .filter((field) => isVisible(field, values))
    .map((field) => withAll({ ...field, options: dependentOptions(field, fields, values) }, t('list.all')));

  /** Changer un filtre vide ceux qui en dépendent (changer de type remet le statut à « Tous »). */
  function change(name: string, value: FieldValue) {
    const children = fields.filter((field) => field.depends_on === name).map((field) => field.name);
    setValues((previous) => ({ ...previous, [name]: value, ...Object.fromEntries(children.map((child) => [child, ''])) }));
  }

  /** Un intervalle à l'envers (max sous le min) : erreur sous le champ, rien n'est appliqué. */
  function rangeErrors(): Record<string, string> {
    return Object.fromEntries(
      fields
        .filter((field) => field.type === 'range')
        .flatMap((field) => {
          const [min = '', max = ''] = Array.isArray(values[field.name]) ? (values[field.name] as string[]) : [];
          const wrong = min.trim() !== '' && max.trim() !== '' && Number(max) < Number(min);

          return wrong ? [[field.name, t('form.rangeOrder')]] : [];
        }),
    );
  }

  function apply() {
    const found = rangeErrors();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      return;
    }

    // Un filtre masqué par sa condition (« Logement » sans type de demande) n'est pas appliqué.
    const shown = new Set(visibleFields.map((field) => field.name));
    setFilterValues(list, Object.fromEntries(Object.entries(values).filter(([name]) => shown.has(name))));
    router.back();
  }

  function clear() {
    // Les filtres cachés restent : ils ne se choisissent pas ici.
    setFilterValues(list, fixedValues(fields, current));
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <BackStackProvider>
          <BackHeader title={t('list.filters')} />
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="filter-screen">
            {/* Un filtre caché filtre sans s'afficher (décision 2026-11-21-demandes-filtre-logement-cache). */}
            {visibleFields.filter((field) => !isFixedFilter(field)).map((field) => (
              <FormField
                key={field.name}
                field={{ ...field, required: false }}
                value={values[field.name] ?? initialValue(field)}
                error={errors[field.name]}
                onChange={(value) => change(field.name, value)}
              />
            ))}
          </ScrollView>
          <View style={[styles.bar, { borderTopColor: theme.backgroundSelected, backgroundColor: theme.background }]} testID="filter-bar">
            <Pressable testID="filter-clear" accessibilityRole="button" onPress={clear} hitSlop={Spacing.two}>
              <ThemedText type="linkPrimary">{t('list.clearFilters')}</ThemedText>
            </Pressable>
            <Pressable
              testID="filter-apply"
              accessibilityRole="button"
              onPress={apply}
              style={({ pressed }) => [styles.apply, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                {t('list.applyFilters')}
              </ThemedText>
            </Pressable>
          </View>
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
  },
  apply: { flex: 1, maxWidth: 240, alignItems: 'center', borderRadius: 8, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
});
