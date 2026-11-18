import { SymbolView } from "expo-symbols";
import { useRef, type ReactElement } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { ThemedText } from "@/shared/theme/components/themed-text";
import { useTheme } from "@/shared/theme/hooks/use-theme";
import { Spacing } from "@/shared/theme/theme";

/** Champ de recherche : la liste ne filtre rien, elle rend la saisie à qui l'affiche. */
export type ListSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
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
  /**
   * Champ de recherche au-dessus de la liste, hors de la zone qui défile : le
   * clavier reste ouvert pendant que les items changent.
   */
  search?: ListSearch | null;
  /** Contenu au-dessus des items (bouton, message). */
  header?: ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Liste générique à défilement infini, utilisable par toute feature avec ses
 * propres données (décision 2026-11-18-contrat-liste-infinie-role-admin). Elle
 * ignore d'où viennent les items : en approchant du bas, elle demande la suite
 * (`onLoadMore`) tant qu'il en reste (`hasMore`), une seule demande à la fois.
 * Avec `search`, elle affiche un champ de recherche (décision
 * 2026-11-18-recherche-dans-la-liste).
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
  header,
  contentContainerStyle,
  testID,
}: ListProps<T>) {
  const theme = useTheme();
  // FlatList peut signaler le bas plusieurs fois avant que `loadingMore` ne passe à vrai.
  const requesting = useRef(false);

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
          <ThemedText
            themeColor="textSecondary"
            style={styles.empty}
            testID={testID ? `${testID}-empty` : undefined}
          >
            {empty}
          </ThemedText>
        ) : undefined
      }
      ListFooterComponent={
        loadingMore ? (
          <View
            style={styles.footer}
            accessibilityLabel={loadingMoreLabel}
            testID={testID ? `${testID}-loading-more` : undefined}
          >
            <ActivityIndicator />
          </View>
        ) : undefined
      }
      ItemSeparatorComponent={Separator}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
    />
  );

  if (!search) {
    return list;
  }

  return (
    <View style={styles.fill}>
      <View
        style={[StyleSheet.flatten(contentContainerStyle), styles.searchBar]}
      >
        <View
          style={[
            styles.searchField,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <SymbolView
            testID={testID ? `${testID}-search-icon` : undefined}
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            size={18}
            tintColor={theme.textSecondary}
          />
          <TextInput
            testID={testID ? `${testID}-search` : undefined}
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
  searchBar: { paddingBottom: 0 },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
  },
  search: { flex: 1, paddingVertical: Spacing.two, fontSize: 16 },
  header: { gap: Spacing.three, marginBottom: Spacing.three },
  empty: { textAlign: "center" },
  footer: { paddingVertical: Spacing.three },
  separator: { height: Spacing.two },
});
