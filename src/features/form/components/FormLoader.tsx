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
  /** Nom du formulaire dans l'API (`auth.login`, `auth.profile.preferences`…). */
  name: string;
  onSubmit: (values: FormValues) => Promise<void>;
  /** Le titre est affiché par l'en-tête de l'écran : le formulaire ne le répète pas. */
  hideTitle?: boolean;
  /** Action irréversible : bouton d'envoi rouge. */
  destructive?: boolean;
};

/**
 * Charge la définition d'un formulaire depuis l'API et l'affiche. Une nouvelle
 * définition (autre langue) repart de ses valeurs par défaut.
 */
export function FormLoader({ name, onSubmit, hideTitle = false, destructive = false }: FormLoaderProps) {
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
    // Sans réseau, message et bouton locaux : l'API ne peut pas fournir leurs textes.
    const offline = query.error instanceof NetworkError;

    return (
      <View style={styles.center}>
        <ThemedText style={styles.error} accessibilityRole="alert">
          {offline ? t('offline.message') : t('error.unknown')}
        </ThemedText>
        <Pressable accessibilityRole="button" testID="form-retry" onPress={() => query.refetch()}>
          <ThemedText type="linkPrimary">{offline ? t('offline.retry') : t('form.retry')}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return <DynamicForm key={`${name}-${locale}`} definition={query.data} onSubmit={onSubmit} hideTitle={hideTitle} destructive={destructive} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  error: { color: ERROR_COLOR },
});
