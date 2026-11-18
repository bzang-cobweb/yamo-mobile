import { SymbolView } from 'expo-symbols';
import { useRef, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

/** Champ de recherche : la liste ne filtre rien, elle rend la saisie à qui l'affiche. */
export type ListSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

/** Bouton « + » de création : `label` est son nom lu par l'accessibilité. */
export type ListCreate = {
  label: string;
  onPress: () => void;
};

export type ListProps<T> = {
  items: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  /** Reste-t-il des items à charger après ceux affichés ? */
  hasMore?: boolean;
  /** Charge la suite ; la promesse rendue marque la fin du chargement. */
  onLoadMore?: () => unknown;
  /** Suite en cours de chargement : indicateur en pied de liste. */
  loadingMore?: boolean;
  /** Libellé lu par l'accessibilité pendant le chargement de la suite. */
  loadingMoreLabel?: string;
  /** Tirer vers le bas recharge la liste. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Texte affiché quand il n'y a aucun item. */
  empty?: string | null;
  /** Champ de recherche, dans la barre fixe au-dessus de la liste. */
  search?: ListSearch | null;
  /** Bouton « + », à droite de la barre fixe. */
  create?: ListCreate | null;
  /** Contenu en tête des items, qui défile avec eux (message, erreur). */
  header?: ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Liste générique à défilement infini, utilisable par toute feature avec ses
 * propres données (décision 2026-11-18-contrat-liste-infinie-role-admin). Elle
 * ignore d'où viennent les items : en approchant du bas, elle demande la suite
 * (`onLoadMore`) tant qu'il en reste (`hasMore`), une seule demande à la fois.
 *
 * Au-dessus de la partie qui défile, une barre fixe porte le champ de recherche
 * (`search`, décision 2026-11-18-recherche-dans-la-liste) et le bouton « + »
 * (`create`, décision 2026-11-18-bouton-ajout-fixe) : toujours à portée, et le
 * clavier reste ouvert pendant que les items changent.
 */
export function List<T>({
  items,
  keyExtractor,
  renderItem,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  loadingMoreLabel,
  refreshing,
  onRefresh,
  empty,
  search,
  create,
  header,
  contentContainerStyle,
  testID,
}: ListProps<T>) {
  const theme = useTheme();
  // FlatList peut signaler le bas plusieurs fois avant que `loadingMore` ne passe à vrai.
  const requesting = useRef(false);
  const id = (suffix: string) => (testID ? `${testID}-${suffix}` : undefined);

  function loadMore() {
    if (!hasMore || loadingMore || requesting.current || !onLoadMore) {
      return;
    }

    requesting.current = true;
    void Promise.resolve()
      .then(onLoadMore)
      .catch(() => undefined)
      .finally(() => {
        requesting.current = false;
      });
  }

  const list = (
    <FlatList
      testID={testID}
      data={items}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshing={onRefresh ? (refreshing ?? false) : undefined}
      onRefresh={onRefresh}
      ListHeaderComponent={header ?? undefined}
      ListHeaderComponentStyle={styles.header}
      ListEmptyComponent={
        empty ? (
          <ThemedText themeColor="textSecondary" style={styles.empty} testID={id('empty')}>
            {empty}
          </ThemedText>
        ) : undefined
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer} accessibilityLabel={loadingMoreLabel} testID={id('loading-more')}>
            <ActivityIndicator />
          </View>
        ) : undefined
      }
      ItemSeparatorComponent={Separator}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
    />
  );

  if (!search && !create) {
    return list;
  }

  return (
    <View style={styles.fill}>
      <View style={[StyleSheet.flatten(contentContainerStyle), styles.bar]} testID={id('bar')}>
        {search && (
          <View style={[styles.searchField, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView
              testID={id('search-icon')}
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={18}
              tintColor={theme.textSecondary}
            />
            <TextInput
              testID={id('search')}
              value={search.value}
              onChangeText={search.onChange}
              placeholder={search.placeholder}
              accessibilityLabel={search.placeholder}
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={[styles.search, { color: theme.text }]}
            />
          </View>
        )}
        {create && (
          <Pressable
            testID={id('create')}
            accessibilityRole="button"
            accessibilityLabel={create.label}
            hitSlop={Spacing.two}
            onPress={create.onPress}
            style={({ pressed }) => [styles.create, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <SymbolView
              testID={id('create-icon')}
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              size={20}
              tintColor={theme.text}
            />
          </Pressable>
        )}
      </View>
      {list}
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.two, paddingBottom: 0 },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
  },
  search: { flex: 1, paddingVertical: Spacing.two, fontSize: 16 },
  create: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  header: { gap: Spacing.three, marginBottom: Spacing.three },
  empty: { textAlign: 'center' },
  footer: { paddingVertical: Spacing.three },
  separator: { height: Spacing.two },
});
