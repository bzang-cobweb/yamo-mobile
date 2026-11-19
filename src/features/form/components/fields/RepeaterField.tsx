import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Accordion } from '@/shared/components/Accordion';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps, FieldValue, RepeaterItem } from '../../types';
import { initialValue } from '../../utils/values';
import { ERROR_COLOR, FieldShell } from '../FieldShell';
import { FormField } from '../FormField';

/**
 * Liste de groupes de sous-champs (décision 2026-11-19-contrat-offer-informations) :
 * l'utilisateur ajoute un groupe, le remplit, en retire un. Laravel décrit les
 * sous-champs, le nombre maximal et le libellé du bouton d'ajout ; chaque sous-champ
 * est rendu par le champ générique. Un sous-champ `hidden` (l'identifiant d'un groupe
 * enregistré) n'est pas affiché mais repart tel quel. Les erreurs de l'API d'un
 * sous-champ (`informations.0.title`) s'affichent sous lui.
 *
 * Chaque groupe est une section repliable titrée par son premier texte (décision
 * 2026-11-19-repeater-accordeon) : fermée par défaut ; un groupe qu'on vient
 * d'ajouter s'ouvre pour être rempli, et un groupe en erreur s'ouvre aussi.
 */
export function RepeaterField({ field, value, onChange, errors, disabled }: FieldProps<RepeaterItem[]>) {
  const { t } = useI18n();
  const theme = useTheme();
  const settings = field.repeater;
  // Les groupes ouverts, par position ; tous fermés au départ.
  const [opened, setOpened] = useState<number[]>([]);

  if (!settings) {
    return null;
  }

  const subFields = settings.fields;
  const canAdd = value.length < settings.max_items;
  // Le titre d'un groupe : la valeur de son premier sous-champ texte.
  const titleField = subFields.find((sub) => sub.type === 'text');

  function hasErrors(index: number): boolean {
    return Object.keys(errors ?? {}).some((key) => key.startsWith(`${field.name}.${index}.`));
  }

  function toggle(index: number, open: boolean) {
    setOpened((current) => (open ? [...current, index] : current.filter((at) => at !== index)));
  }

  function add() {
    // Un groupe vide : chaque sous-champ à sa valeur de départ (texte vide).
    const empty = Object.fromEntries(subFields.map((sub) => [sub.name, String(initialValue({ ...sub, default: null }))]));
    // Le nouveau groupe s'ouvre pour être rempli.
    setOpened((current) => [...current, value.length]);
    onChange([...value, empty]);
  }

  function update(index: number, name: string, next: FieldValue) {
    onChange(value.map((item, at) => (at === index ? { ...item, [name]: typeof next === 'string' ? next : String(next) } : item)));
  }

  function remove(index: number) {
    // Les positions suivantes reculent d'une place.
    setOpened((current) => current.filter((at) => at !== index).map((at) => (at > index ? at - 1 : at)));
    onChange(value.filter((_, at) => at !== index));
  }

  return (
    // L'erreur du champ lui-même (trop de groupes) ; celles des sous-champs vont sous eux.
    <FieldShell field={field} error={errors?.[field.name]?.[0]}>
      <View style={styles.items} testID={`field-${field.name}`}>
        {value.map((item, index) => (
          <Accordion
            key={item.id || `new-${index}`}
            title={(titleField && item[titleField.name]?.trim()) || t('form.repeaterUntitled')}
            open={opened.includes(index) || hasErrors(index)}
            onToggle={(open) => toggle(index, open)}
            style={[styles.item, { borderColor: theme.backgroundSelected }]}
            testID={`field-${field.name}-item-${index}`}>
            {subFields
              .filter((sub) => sub.type !== 'hidden')
              .map((sub) => {
                const path = `${field.name}.${index}.${sub.name}`;

                return (
                  <FormField
                    key={sub.name}
                    field={{ ...sub, name: path }}
                    value={item[sub.name] ?? ''}
                    onChange={(next) => update(index, sub.name, next)}
                    error={errors?.[path]?.[0]}
                    disabled={disabled}
                  />
                );
              })}
            <Pressable
              testID={`field-${field.name}-remove-${index}`}
              accessibilityRole="button"
              accessibilityLabel={t('form.repeaterRemove')}
              disabled={disabled}
              hitSlop={Spacing.one}
              onPress={() => remove(index)}
              style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
              <ThemedText type="small" style={styles.removeText}>
                {t('form.repeaterRemove')}
              </ThemedText>
            </Pressable>
          </Accordion>
        ))}
        {canAdd && (
          <Pressable
            testID={`field-${field.name}-add`}
            accessibilityRole="button"
            disabled={disabled}
            onPress={add}
            style={({ pressed }) => [styles.add, { borderColor: theme.primary }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {`+ ${settings.add_label ?? t('form.repeaterAdd')}`}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  items: { gap: Spacing.three },
  item: { marginTop: 0, borderWidth: 1, borderRadius: 8, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  remove: { alignSelf: 'flex-end', paddingVertical: Spacing.one },
  removeText: { color: ERROR_COLOR },
  add: { alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
});
