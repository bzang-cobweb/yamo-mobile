import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';

import { formService } from '../../services/FormService';
import type { FieldProps, FieldSuggestion, FieldType } from '../../types';
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
 * masqué, avec un bouton pour afficher ce qui a été saisi. Un champ `text` avec
 * `suggestions` propose, sous la saisie, les réponses de son point d'API.
 */
export function TextField({ field, value, onChange, error, disabled, onSubmitEditing, onFill }: FieldProps<string>) {
  const inputStyle = useInputStyle(Boolean(error));
  const { t } = useI18n();
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);
  const suggestions = useSuggestions(field.type === 'text' ? field.suggestions : null, value);

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
      {/* Les suggestions sous la saisie ; en choisir une remplit ce champ et les autres. */}
      {suggestions.items.length > 0 && (
        <View style={[styles.suggestions, { borderColor: theme.backgroundSelected, backgroundColor: theme.background }]} testID={`field-${field.name}-suggestions`}>
          {suggestions.items.map((item, index) => (
            <Pressable
              key={`${item.label}-${index}`}
              testID={`field-${field.name}-suggestion-${index}`}
              accessibilityRole="button"
              onPress={() => {
                suggestions.choose(item.value);
                onChange(item.value);
                onFill?.(item.fill);
              }}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
              <ThemedText type="small">{item.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </FieldShell>
  );
}

/** Attente après la dernière frappe avant de demander des suggestions. */
const SUGGESTION_DELAY = 300;
const SUGGESTION_MIN_LENGTH = 3;

/**
 * Les suggestions servies par `endpoint` pour la saisie `value` (décision
 * 2026-11-19-contrat-adresse-offre-recherche) : à partir de 3 caractères, après
 * une courte attente ; plus rien une fois une suggestion choisie, jusqu'à la
 * prochaine frappe. Un échec ne montre simplement rien.
 */
function useSuggestions(endpoint: string | null | undefined, value: string) {
  const [items, setItems] = useState<FieldSuggestion[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const query = value.trim();
  const active = Boolean(endpoint) && query.length >= SUGGESTION_MIN_LENGTH && query !== chosen;

  useEffect(() => {
    if (!active || !endpoint) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      formService
        .suggestions(endpoint, query)
        .then((found) => !cancelled && setItems(found))
        .catch(() => !cancelled && setItems([]));
    }, SUGGESTION_DELAY);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, endpoint, query]);

  return {
    items: active ? items : [],
    choose: (picked: string) => setChosen(picked.trim()),
  };
}

const styles = StyleSheet.create({
  row: { justifyContent: 'center' },
  withToggle: { paddingRight: TOGGLE_SIZE + 24 },
  toggle: { position: 'absolute', right: 12 },
  suggestions: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  suggestion: { paddingHorizontal: 12, paddingVertical: 10 },
  pressed: { opacity: 0.6 },
});
