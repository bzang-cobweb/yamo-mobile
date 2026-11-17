import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { formService } from '../../services/FormService';
import type { FieldSuggestions, Suggestion } from '../../types';

/** Attente après la dernière frappe avant de demander les suggestions. */
export const SUGGESTION_DELAY_MS = 300;

type Props = {
  name: string;
  suggestions: FieldSuggestions;
  /** La saisie en cours. */
  query: string;
  /** Valeur des champs passés en paramètre (ex. le pays choisi). */
  params: Record<string, string>;
  onPick: (suggestion: Suggestion) => void;
};

/**
 * Suggestions servies par l'API sous un champ texte, pendant la saisie
 * (décision 2026-11-18-adresse-du-compte-modele) : demandées à partir de
 * `min_length` caractères, après une courte pause. Une erreur (réseau, limite de
 * débit) n'affiche simplement rien : la saisie libre reste possible.
 */
export function SuggestionList({ name, suggestions, query, params, onPick }: Props) {
  const theme = useTheme();
  const [items, setItems] = useState<Suggestion[]>([]);
  const trimmed = query.trim();
  const paramsKey = JSON.stringify(params);

  const searchable = trimmed.length >= suggestions.min_length;

  useEffect(() => {
    if (!searchable) {
      return;
    }

    let current = true;
    const timer = setTimeout(() => {
      formService
        .suggestions(suggestions, trimmed, JSON.parse(paramsKey) as Record<string, string>)
        .then((found) => current && setItems(found))
        .catch(() => current && setItems([]));
    }, SUGGESTION_DELAY_MS);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [searchable, trimmed, paramsKey, suggestions]);

  // Sous la longueur minimale, rien n'est proposé (les suggestions précédentes non plus).
  if (!searchable || items.length === 0) {
    return null;
  }

  return (
    <View testID={`field-${name}-suggestions`} accessibilityRole="list" style={[styles.list, { borderColor: theme.backgroundSelected }]}>
      {items.map((item, index) => (
        <Pressable
          key={`${item.label}-${index}`}
          testID={`field-${name}-suggestion-${index}`}
          accessibilityRole="button"
          onPress={() => {
            setItems([]);
            onPick(item);
          }}
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">{item.label}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, overflow: 'hidden' },
  item: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
});
