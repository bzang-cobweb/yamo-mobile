import { useState } from 'react';
import { Pressable } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';
import { OptionsModal } from './OptionsModal';

/** Options affichées au plus dans une liste à rechercher. */
export const SEARCHABLE_LIMIT = 10;

/** Liste déroulante : la valeur choisie s'affiche ; un appui ouvre la liste des options. */
export function SelectField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const { t } = useI18n();
  const inputStyle = useInputStyle(Boolean(error));
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
        style={inputStyle}>
        <ThemedText themeColor={selected ? 'text' : 'textSecondary'}>
          {selected?.label ?? field.placeholder ?? t('form.selectPlaceholder')}
        </ThemedText>
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
        // Une liste à rechercher (un membre, un logement) : 10 options au plus, la recherche trouve les autres.
        limit={field.searchable ? SEARCHABLE_LIMIT : undefined}
        // Facultatif : la valeur choisie peut être retirée (décision 2026-11-21-choix-facultatif-effacable),
        // sauf si une option vide le permet déjà (« Tous » d'un filtre).
        clearable={!field.required && !field.options.some((option) => option.value === '')}
      />
    </FieldShell>
  );
}
