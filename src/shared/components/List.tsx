import { SymbolView } from 'expo-symbols';
import { useRef, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { FilterLink, type ListFilter } from './FilterLink';

export type { ListFilter };

/** Champ de recherche : la liste ne filtre rien, elle rend la saisie à qui l'affiche. */
export type ListSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Le champ prend la main (un menu ouvert se referme, décision 2026-11-24-menu-se-ferme-au-toucher). */
  onFocus?: () => void;
};

/** Lien de création : son libellé, affiché, et son action. */
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
  /** Champ de recherche, sur toute la largeur de la zone fixe au-dessus de la liste. */
  search?: ListSearch | null;
  /** Lien de création, sous la recherche, aligné à droite, dans la zone fixe. */
  create?: ListCreate | null;
  /** Lien des filtres, sous la recherche, aligné à droite, avec un badge (décision 2026-11-19-contrat-filtres-vitrine). */
  filter?: ListFilter | null;
  /** Contenu en tête des items, qui défile avec eux (message, erreur). */
  header?: ReactElement | null;
  /** Le doigt commence à faire défiler la liste (fermer un menu ouvert, décision 2026-11-21-menu-fermer-ailleurs). */
  onScrollBeginDrag?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Liste générique à défilement infini, utilisable par toute feature avec ses
 * propres données (décision 2026-11-18-contrat-liste-infinie-role-admin). Elle
 * ignore d'où viennent les items : en approchant du bas, elle demande la suite
 * (`onLoadMore`) tant qu'il en reste (`hasMore`), une seule demande à la fois.
 *
 * Au-dessus de la partie qui défile, une zone fixe porte le champ de recherche
 * sur toute la largeur (`search`, décision 2026-11-18-recherche-dans-la-liste),
 * puis le lien de création aligné à droite (`create`, décision
 * 2026-11-18-lien-creation-sous-recherche) : toujours à portée, et le clavier
 * reste ouvert pendant que les items changent.
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
  filter,
  header,
  onScrollBeginDrag,
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
      onScrollBeginDrag={onScrollBeginDrag}
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

  if (!search && !create && !filter) {
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
              size={SEARCH_ICON_SIZE}
              tintColor={theme.textSecondary}
            />
            <TextInput
              testID={id('search')}
              value={search.value}
              onChangeText={search.onChange}
              onFocus={search.onFocus}
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
            hitSlop={Spacing.two}
            onPress={create.onPress}
            style={({ pressed }) => [styles.create, pressed && styles.pressed]}>
            <ThemedText type="linkPrimary">{create.label}</ThemedText>
          </Pressable>
        )}
        {filter && <FilterLink filter={filter} testID={id('filter') ?? 'list-filter'} />}
      </View>
      {list}
    </View>
  );
}

/** La marge intérieure d'une carte de liste et l'écart entre ses lignes, les mêmes partout (décision 2026-11-22-cartes-espacements-accueil). */
export const CARD_PADDING = Spacing.two;
export const CARD_GAP = Spacing.one;
/** La zone sous la photo d'une carte : un retrait de 8 sur les côtés, 4 en haut et en bas (décision 2026-11-22-cartes-espace-sous-photo). */
export const CARD_BODY = { gap: CARD_GAP, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one } as const;

/** La hauteur minimale de la barre de recherche et la taille de sa loupe (décision 2026-11-21-recherche-plus-grande). */
export const SEARCH_HEIGHT = 48;
const SEARCH_ICON_SIZE = 20;

function Separator() {
  return <View style={styles.separator} testID="list-separator" />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { gap: Spacing.two, paddingBottom: 0 },
  // Plus grande, sur toutes les listes (décision 2026-11-21-recherche-plus-grande) : 48 de haut au moins.
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    minHeight: SEARCH_HEIGHT,
  },
  search: { flex: 1, paddingVertical: Spacing.three, fontSize: 17 },
  create: { alignSelf: 'flex-end', paddingVertical: Spacing.one },
  pressed: { opacity: 0.6 },
  header: { gap: Spacing.three, marginBottom: Spacing.three },
  empty: { textAlign: 'center' },
  footer: { paddingVertical: Spacing.three },
  // L'écart entre deux cartes, dans toutes les listes (décision 2026-11-21-ecart-cartes).
  separator: { height: Spacing.three },
});
