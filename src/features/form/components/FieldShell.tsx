import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import type { FormFieldDefinition } from '../types';

export const ERROR_COLOR = '#d93025';

/** Cadre commun d'un champ : libellé (et marque d'obligation), aide, erreur de l'API. */
export function FieldShell({ field, error, children }: PropsWithChildren<{ field: FormFieldDefinition; error?: string }>) {
  return (
    <View style={styles.container}>
      {field.label !== null && (
        <ThemedText type="smallBold" nativeID={`${field.name}-label`}>
          {field.label}
          {field.required && <ThemedText style={styles.required}> *</ThemedText>}
        </ThemedText>
      )}
      {children}
      {field.help !== null && !error && (
        <ThemedText type="small" themeColor="textSecondary">
          {field.help}
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
});
