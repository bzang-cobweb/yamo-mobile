import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { NetworkError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { useFormDefinition } from '../hooks/useFormDefinition';
import type { FormValues } from '../types';
import { DynamicForm } from './DynamicForm';
import { ERROR_COLOR } from './FieldShell';

type FormLoaderProps = {
  /** Nom du formulaire dans l'API (`auth.login`, `auth.profile.locale`…). */
  name: string;
  onSubmit: (values: FormValues) => Promise<void>;
};

/**
 * Charge la définition d'un formulaire depuis l'API et l'affiche. Une nouvelle
 * définition (autre langue) repart de ses valeurs par défaut.
 */
export function FormLoader({ name, onSubmit }: FormLoaderProps) {
  const { t, locale } = useI18n();
  const query = useFormDefinition(name);

  if (query.isPending) {
    return (
      <View style={styles.center} accessibilityLabel={t('form.loading')}>
        <ActivityIndicator />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.error} accessibilityRole="alert">
          {query.error instanceof NetworkError ? t('error.network') : t('error.unknown')}
        </ThemedText>
        <Pressable accessibilityRole="button" onPress={() => query.refetch()}>
          <ThemedText type="linkPrimary">↻</ThemedText>
        </Pressable>
      </View>
    );
  }

  return <DynamicForm key={`${name}-${locale}`} definition={query.data} onSubmit={onSubmit} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  error: { color: ERROR_COLOR },
});
