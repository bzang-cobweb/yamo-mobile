import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useListDefinition } from '@/features/list/hooks/useListDefinition';
import type { ListItem } from '@/features/list/types';
import { NetworkError } from '@/shared/api/errors';
import { List } from '@/shared/components/List';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

/** La vitrine servie par l'API : offres publiées du pays courant. */
export const BROWSE_LIST = 'offer.browse';

const SEARCH_DELAY = 300;

/**
 * Les offres publiées du pays courant (décision 2026-11-18-accueil-offres-du-pays),
 * pour un visiteur comme pour un membre : liste générique, défilement infini,
 * recherche dans le titre. Titre, puis prix et ville. Toucher une offre ne fait
 * rien encore (sa fiche viendra).
 */
export function BrowseScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const query = useListDefinition(BROWSE_LIST, search);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), SEARCH_DELAY);

    return () => clearTimeout(timer);
  }, [searchText]);

  const definition = query.data;

  if (query.isPending || query.isError || !definition) {
    return (
      <View style={styles.center}>
        {query.isPending ? (
          <ActivityIndicator accessibilityLabel={t('list.loading')} />
        ) : (
          <>
            <ThemedText themeColor="textSecondary" accessibilityRole="alert">
              {query.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}
            </ThemedText>
            <Pressable accessibilityRole="button" testID="browse-retry" onPress={() => query.refetch()}>
              <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  async function refresh() {
    setRefreshing(true);

    try {
      await query.reload();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <List<ListItem>
      testID="browse-list"
      items={definition.items}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <View testID={`browse-item-${item.id}`} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">{item.title}</ThemedText>
          {item.subtitle && (
            <ThemedText type="small" themeColor="textSecondary">
              {item.subtitle}
            </ThemedText>
          )}
        </View>
      )}
      hasMore={query.hasNextPage}
      onLoadMore={() => query.fetchNextPage()}
      loadingMore={query.isFetchingNextPage}
      loadingMoreLabel={t('list.loading')}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      empty={search ? t('list.noResults') : definition.empty}
      search={definition.search ? { value: searchText, onChange: setSearchText, placeholder: definition.search } : null}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four },
  card: { borderRadius: 8, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: Spacing.half },
});
