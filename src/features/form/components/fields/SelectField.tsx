import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';
import { OptionsModal } from './OptionsModal';

/** Options affichées au plus dans une liste à rechercher. */
export const SEARCHABLE_LIMIT = 10;

/** Liste déroulante : la valeur choisie s'affiche ; un appui ouvre la liste des options. */
export function SelectField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const { t } = useI18n();
  const theme = useTheme();
  const inputStyle = useInputStyle(Boolean(error), Boolean(field.readonly));
  const [open, setOpen] = useState(false);
  const selected = field.options.find((option) => option.value === value);

  return (
    <FieldShell field={field} error={error}>
      <Pressable
        testID={`field-${field.name}`}
        accessibilityRole="button"
        accessibilityLabel={field.label ?? field.name}
        accessibilityValue={{ text: selected?.label }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[inputStyle, styles.row]}>
        <ThemedText themeColor={selected ? 'text' : 'textSecondary'} numberOfLines={1} style={styles.value}>
          {selected?.label ?? field.placeholder ?? t('form.selectPlaceholder')}
        </ThemedText>
        {/* Une flèche : le champ s'ouvre (décision 2026-11-27-select-images) ; en lecture seule, rien. */}
        {!field.readonly && (
          <SymbolView name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={16} tintColor={theme.textSecondary} testID={`field-${field.name}-chevron`} />
        )}
      </Pressable>

      <OptionsModal
        visible={open}
        title={field.label}
        options={field.options}
        selected={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
        testIDPrefix={`field-${field.name}`}
        searchable={Boolean(field.searchable)}
        // La limite servie par le champ ; à défaut, une liste à rechercher (un membre, un logement) : SEARCHABLE_LIMIT options
        // au plus, la recherche trouve les autres (décision 2026-11-27-select-limite).
        limit={field.search_limit ?? (field.searchable ? SEARCHABLE_LIMIT : undefined)}
        // Facultatif : la valeur choisie peut être retirée (décision 2026-11-21-choix-facultatif-effacable),
        // sauf si une option vide le permet déjà (« Tous » d'un filtre).
        clearable={!field.required && !field.options.some((option) => option.value === '')}
      />
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  // La valeur à gauche, la flèche à droite.
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  value: { flex: 1 },
});
