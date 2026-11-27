import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheet } from '@/shared/components/BottomSheet';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
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

/**
 * Fenêtre de choix commune aux listes déroulantes, au pays d'un téléphone et au pays courant : un panneau qui monte du bas, à
 * la hauteur de son contenu, avec sa recherche ; une option peut avoir une image devant son libellé (décision
 * 2026-11-27-select-images).
 */
export function OptionsModal({ visible, title, options, selected, onSelect, onClose, testIDPrefix, searchable = false, limit, clearable = false, icon }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  // La hauteur du contenu à l'ouverture, toutes les options affichées : la recherche ne la réduit pas, le panneau ne
  // rapetisse pas à chaque lettre (décision 2026-11-27-select-hauteur-stable).
  const [height, setHeight] = useState<number | null>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();

    const found = needle === '' ? options : options.filter((option) => `${option.label} ${option.hint ?? ''}`.toLocaleLowerCase().includes(needle));

    return limit === undefined ? found : found.slice(0, limit);
  }, [options, query, limit]);

  function close() {
    setQuery('');
    setHeight(null);
    onClose();
  }

  return (
    // Un panneau qui monte du bas, à la hauteur de son contenu (décision 2026-11-27-select-images) ; une longue liste
    // défile, jusqu'à la taille maximale.
    <BottomSheet visible={visible} title={title ?? ''} fitContent onClose={close} testID={`${testIDPrefix}-options`}>
      <View
        style={[styles.body, height !== null && { minHeight: height }]}
        onLayout={(event) => {
          // Mesurée sans recherche ; ensuite, elle ne fait que grandir (la liste complète après une recherche vidée).
          const measured = event.nativeEvent.layout.height;
          if (query === '' && (height === null || measured > height)) {
            setHeight(measured);
          }
        }}
        testID={`${testIDPrefix}-options-body`}>
        {(searchable || options.length > SEARCH_FROM) && (
          // Une loupe devant, comme la recherche des listes (décision 2026-11-27-select-loupe).
          <View style={[styles.searchField, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView
              testID={`${testIDPrefix}-search-icon`}
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={18}
              tintColor={theme.textSecondary}
            />
            <TextInput
              testID={`${testIDPrefix}-search`}
              value={query}
              onChangeText={setQuery}
              placeholder={t('form.search')}
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              style={[styles.search, { color: theme.text }]}
            />
          </View>
        )}
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
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
                    tintColor={option.value === selected ? theme.text : theme.textSecondary}
                    size={18}
                  />
                )}
                {/* Son image devant, comme le drapeau d'un pays (la photo d'un logement). */}
                {option.image && (
                  <Image
                    source={{ uri: option.image }}
                    style={styles.image}
                    contentFit="cover"
                    accessibilityIgnoresInvertColors
                    testID={`${testIDPrefix}-option-${option.value}-image`}
                  />
                )}
                <ThemedText style={styles.label}>{option.label}</ThemedText>
                {option.hint && <ThemedText themeColor="textSecondary">{option.hint}</ThemedText>}
                {option.value === selected && <ThemedText type="smallBold">✓</ThemedText>}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, padding: Spacing.four, paddingTop: Spacing.three, gap: Spacing.two },
  list: { flexShrink: 1 },
  searchField: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 8, paddingHorizontal: Spacing.three },
  search: { flex: 1, paddingVertical: Spacing.two, fontSize: 16 },
  option: { paddingVertical: Spacing.three },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  image: { width: 40, height: 40, borderRadius: 8 },
  label: { flex: 1 },
  pressed: { opacity: 0.6 },
});
