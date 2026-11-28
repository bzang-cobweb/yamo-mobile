import { useId, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { NetworkError } from '@/shared/api/errors';
import { useFixedFooter } from '@/shared/components/FixedFooterLayout';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { useFormDefinition } from '../hooks/useFormDefinition';
import type { FormValues } from '../types';
import { DynamicForm, SubmitButton } from './DynamicForm';
import { ERROR_COLOR } from './FieldShell';

type FormLoaderProps = {
  /** Nom du formulaire dans l'API (`auth.login`, `auth.code`…). */
  name: string;
  /** Enregistrement auquel le formulaire est lié (`?record=`), s'il y en a un. */
  record?: string;
  onSubmit: (values: FormValues) => Promise<void>;
  /** Le titre est affiché par l'en-tête de l'écran : le formulaire ne le répète pas. */
  hideTitle?: boolean;
  /** Des paramètres de la demande du formulaire (`?channel=email`), dès le premier chargement. */
  params?: Record<string, string>;
  /** Des valeurs de départ choisies par l'app, à la place des valeurs par défaut servies (voir `DynamicForm`). */
  defaults?: FormValues;
};

/**
 * Charge la définition d'un formulaire depuis l'API et l'affiche. Une nouvelle
 * définition (autre langue) repart de ses valeurs par défaut. Un champ qui
 * recharge le formulaire (`reloads`, ex. la langue de saisie) le redemande avec
 * sa valeur (décision 2026-11-19-contrat-langue-saisie-allemand).
 */
export function FormLoader({ name, record, onSubmit, hideTitle = false, params: initialParams, defaults }: FormLoaderProps) {
  const { t, locale } = useI18n();
  const [params, setParams] = useState<Record<string, string>>(initialParams ?? {});
  const query = useFormDefinition(name, record, params);
  const footer = useFixedFooter();
  const placeholderId = useId();
  const pending = query.isPending;

  // Pendant le chargement de la définition, la barre fixe est déjà là, avec un bouton
  // désactivé qui tourne : elle ne surgit pas après coup. Le formulaire chargé y place
  // son vrai bouton dans le même rendu.
  useLayoutEffect(() => {
    if (footer === null || !pending) {
      return;
    }
    footer.set(placeholderId, <SubmitButton label={'\u00a0'} busy submitting destructive={false} onPress={() => undefined} testID="form-submit-loading" />);

    return () => footer.set(placeholderId, null);
  }, [footer, placeholderId, pending]);

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

  return (
    <DynamicForm
      key={`${name}-${locale}-${JSON.stringify(params)}`}
      definition={query.data}
      onSubmit={onSubmit}
      hideTitle={hideTitle}
      record={record}
      defaults={defaults}
      onReload={(field, value) => setParams((current) => ({ ...current, [field]: value }))}
    />
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  error: { color: ERROR_COLOR },
});
