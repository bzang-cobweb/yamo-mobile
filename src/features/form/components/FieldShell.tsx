import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { TONE_COLORS } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import type { FormFieldDefinition } from '../types';

export const ERROR_COLOR = '#d93025';

/**
 * Cadre commun d'un champ : libellé (et marque d'obligation), le champ, puis
 * l'aide et l'erreur de l'API, distinctes : l'aide reste toujours affichée, en
 * gris ; l'erreur s'ajoute en dessous, en rouge, annoncée comme une alerte.
 *
 * L'unité du champ (`suffix`, « m² », « FCFA / mois ») se lit dans l'aide, après
 * elle : « En plus du loyer. En FCFA / mois » (décision
 * 2026-11-19-contrat-formulaire-etapes-symbole-devise).
 */
export function FieldShell({ field, error, children }: PropsWithChildren<{ field: FormFieldDefinition; error?: string }>) {
  const { t } = useI18n();
  const help = [field.help, field.suffix ? t('form.unit', { unit: field.suffix }) : null].filter(Boolean).join(' ') || null;

  return (
    <View style={styles.container}>
      {/* Une note avant le libellé, un avertissement, en orange comme celle d'un formulaire (décision 2026-11-22-champ-note). */}
      {field.notice ? (
        <ThemedText type="small" style={styles.notice} testID={`${field.name}-notice`}>
          {field.notice}
        </ThemedText>
      ) : null}
      {/* Un libellé masqué par l'API n'est pas affiché ; les contrôles du champ portent le leur. */}
      {field.label !== null && !field.label_hidden && (
        <ThemedText type="smallBold" nativeID={`${field.name}-label`}>
          {field.label}
          {field.required && <ThemedText style={styles.required}> *</ThemedText>}
        </ThemedText>
      )}
      {children}
      {help !== null && (
        <ThemedText type="small" themeColor="textSecondary" testID={`${field.name}-help`}>
          {help}
        </ThemedText>
      )}
      {error && (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert" testID={`${field.name}-error`}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  required: { color: ERROR_COLOR },
  error: { color: ERROR_COLOR },
  notice: { color: TONE_COLORS.warning },
});
