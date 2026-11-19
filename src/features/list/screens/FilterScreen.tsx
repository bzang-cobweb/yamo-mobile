import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DynamicForm } from '@/features/form/components/DynamicForm';
import type { FormDefinition, FormValues } from '@/features/form/types';
import { BackHeader } from '@/shared/components/BackHeader';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { setFilterValues, useListFilters } from '../utils/filters';

/**
 * Les filtres d'une liste (`/filters/[list]`, décision 2026-11-19-contrat-filtres-vitrine) :
 * les champs servis par l'API, préremplis avec les filtres en cours ; « Afficher
 * les offres » les applique, « Effacer » les remet à zéro, puis retour à la liste.
 */
export function FilterScreen({ list }: { list: string }) {
  const { t } = useI18n();
  const { fields, values } = useListFilters(list);

  const definition: FormDefinition = {
    name: list,
    title: null,
    subtitle: null,
    fields: fields.map((field) => ({ ...field, default: values[field.name] ?? field.default, required: false })),
    submit: { label: t('list.applyFilters') },
  };

  async function apply(chosen: FormValues) {
    setFilterValues(list, chosen);
    router.back();
  }

  function clear() {
    setFilterValues(list, {});
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <BackStackProvider>
          <BackHeader title={t('list.filters')} />
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="filter-screen">
            <DynamicForm key={JSON.stringify(values)} definition={definition} onSubmit={apply} hideTitle />
            <Pressable testID="filter-clear" accessibilityRole="button" onPress={clear} style={styles.clear} hitSlop={Spacing.two}>
              <ThemedText type="linkPrimary">{t('list.clearFilters')}</ThemedText>
            </Pressable>
          </ScrollView>
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  clear: { alignSelf: 'center', paddingVertical: Spacing.two },
});
