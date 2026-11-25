import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldOption } from '../../types';

/** Au-delà, la liste propose une recherche (ex. les ~245 pays). */
const SEARCH_FROM = 12;

type Props = {
  visible: boolean;
  title: string | null;
  options: FieldOption[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Préfixe des testID des options (`field-<nom>`). */
  testIDPrefix: string;
  /** Recherche proposée même avec peu d'options. */
  searchable?: boolean;
  /** Au plus ce nombre d'options affichées ; la recherche trouve les autres. Sans : toutes. */
  limit?: number;
  /** Un champ facultatif : une première ligne (« Aucun ») retire la valeur (décision 2026-11-21-choix-facultatif-effacable). */
  clearable?: boolean;
  /** Une icône devant chaque option (l'épingle des régions, décision 2026-11-25-region-icone) ; sans : aucune. */
  icon?: SymbolViewProps['name'];
};

/** Fenêtre de choix commune aux listes déroulantes et au pays d'un téléphone. */
export function OptionsModal({ visible, title, options, selected, onSelect, onClose, testIDPrefix, searchable = false, limit, clearable = false, icon }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();

    const found = needle === '' ? options : options.filter((option) => `${option.label} ${option.hint ?? ''}`.toLocaleLowerCase().includes(needle));

    return limit === undefined ? found : found.slice(0, limit);
  }, [options, query, limit]);

  function close() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <ThemedView type="backgroundElement" style={styles.sheet}>
          {title !== null && <ThemedText type="smallBold">{title}</ThemedText>}
          {(searchable || options.length > SEARCH_FROM) && (
            <TextInput
              testID={`${testIDPrefix}-search`}
              value={query}
              onChangeText={setQuery}
              placeholder={t('form.search')}
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              style={[styles.search, { color: theme.text, backgroundColor: theme.background }]}
            />
          )}
          <ScrollView keyboardShouldPersistTaps="handled">
            {clearable && (
              <Pressable
                testID={`${testIDPrefix}-option-none`}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: selected === '' }}
                onPress={() => {
                  onSelect('');
                  close();
                }}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                <View style={styles.optionRow}>
                  <ThemedText themeColor="textSecondary" style={styles.label}>
                    {t('form.none')}
                  </ThemedText>
                  {selected === '' && <ThemedText type="smallBold">✓</ThemedText>}
                </View>
              </Pressable>
            )}
            {filtered.map((option) => (
              <Pressable
                key={option.value}
                testID={`${testIDPrefix}-option-${option.value}`}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: option.value === selected }}
                onPress={() => {
                  onSelect(option.value);
                  close();
                }}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                <View style={styles.optionRow}>
                  {icon && (
                    <SymbolView
                      testID={`${testIDPrefix}-option-${option.value}-icon`}
                      name={icon}
                      tintColor={option.value === selected ? theme.primary : theme.textSecondary}
                      size={18}
                    />
                  )}
                  <ThemedText style={styles.label}>{option.label}</ThemedText>
                  {option.hint && <ThemedText themeColor="textSecondary">{option.hint}</ThemedText>}
                  {option.value === selected && <ThemedText type="smallBold">✓</ThemedText>}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </ThemedView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two, maxHeight: '75%' },
  search: { borderRadius: 8, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
  option: { paddingVertical: Spacing.three },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { flex: 1 },
  pressed: { opacity: 0.6 },
});
