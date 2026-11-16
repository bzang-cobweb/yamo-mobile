import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { useTheme } from '@/shared/theme/hooks/use-theme';

import type { FieldProps, FieldType } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/** Ce qui distingue `text`, `email` et `password` : clavier, saisie masquée, remplissage automatique. */
const VARIANTS: Partial<Record<FieldType, TextInputProps>> = {
  text: {},
  email: { keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email', textContentType: 'emailAddress' },
  password: { autoCapitalize: 'none', autoCorrect: false, autoComplete: 'password', textContentType: 'password' },
};

const TOGGLE_SIZE = 22;

/**
 * Champ texte : sert les types `text`, `email`, `password` et `hidden`
 * (décision 2026-11-15-contrat-mobile-features-formulaires). Un champ `hidden`
 * garde sa valeur et l'envoie, sans rien afficher. Un champ `password` est
 * masqué, avec un bouton pour afficher ce qui a été saisi.
 */
export function TextField({ field, value, onChange, error, disabled, onSubmitEditing }: FieldProps<string>) {
  const inputStyle = useInputStyle(Boolean(error));
  const { t } = useI18n();
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);

  if (field.type === 'hidden') {
    return null;
  }

  const isPassword = field.type === 'password';

  const input = (
    <TextInput
      testID={`field-${field.name}`}
      accessibilityLabel={field.label ?? field.name}
      style={[inputStyle, isPassword && styles.withToggle]}
      value={value}
      onChangeText={onChange}
      placeholder={field.placeholder ?? undefined}
      editable={!disabled}
      onSubmitEditing={onSubmitEditing}
      secureTextEntry={isPassword && !revealed}
      {...VARIANTS[field.type]}
    />
  );

  return (
    <FieldShell field={field} error={error}>
      {isPassword ? (
        <View style={styles.row}>
          {input}
          <Pressable
            testID={`field-${field.name}-toggle`}
            accessibilityRole="button"
            accessibilityLabel={t(revealed ? 'form.hidePassword' : 'form.showPassword')}
            accessibilityState={{ expanded: revealed }}
            onPress={() => setRevealed((current) => !current)}
            hitSlop={8}
            style={styles.toggle}>
            <SymbolView
              name={revealed ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' } : { ios: 'eye', android: 'visibility', web: 'visibility' }}
              size={TOGGLE_SIZE}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </View>
      ) : (
        input
      )}
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: 'center' },
  withToggle: { paddingRight: TOGGLE_SIZE + 24 },
  toggle: { position: 'absolute', right: 12 },
});
