import { Pressable, StyleSheet, View } from 'react-native';

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
 */
export function RepeaterField({ field, value, onChange, errors, disabled }: FieldProps<RepeaterItem[]>) {
  const { t } = useI18n();
  const theme = useTheme();
  const settings = field.repeater;

  if (!settings) {
    return null;
  }

  const subFields = settings.fields;
  const canAdd = value.length < settings.max_items;

  function add() {
    // Un groupe vide : chaque sous-champ à sa valeur de départ (texte vide).
    const empty = Object.fromEntries(subFields.map((sub) => [sub.name, String(initialValue({ ...sub, default: null }))]));
    onChange([...value, empty]);
  }

  function update(index: number, name: string, next: FieldValue) {
    onChange(value.map((item, at) => (at === index ? { ...item, [name]: typeof next === 'string' ? next : String(next) } : item)));
  }

  function remove(index: number) {
    onChange(value.filter((_, at) => at !== index));
  }

  return (
    // L'erreur du champ lui-même (trop de groupes) ; celles des sous-champs vont sous eux.
    <FieldShell field={field} error={errors?.[field.name]?.[0]}>
      <View style={styles.items} testID={`field-${field.name}`}>
        {value.map((item, index) => (
          <View
            key={item.id || `new-${index}`}
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
          </View>
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
  item: { borderWidth: 1, borderRadius: 8, padding: Spacing.three, gap: Spacing.two },
  remove: { alignSelf: 'flex-end', paddingVertical: Spacing.one },
  removeText: { color: ERROR_COLOR },
  add: { alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
});
