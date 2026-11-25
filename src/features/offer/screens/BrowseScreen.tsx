import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useListDefinition } from '@/features/list/hooks/useListDefinition';
import { activeFilterCount, setFilterFields, useListFilters } from '@/features/list/utils/filters';
import type { ListItem } from '@/features/list/types';
import { NetworkError } from '@/shared/api/errors';
import { List } from '@/shared/components/List';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { OfferCard } from '../components/OfferCard';

/** La vitrine servie par l'API : offres publiées du pays courant. */
export const BROWSE_LIST = 'offer.browse';

const SEARCH_DELAY = 300;

/**
 * Les offres publiées du pays courant (décision 2026-11-18-accueil-offres-du-pays),
 * pour un visiteur comme pour un membre : liste générique, défilement infini,
 * recherche dans le titre. La photo, puis le titre, puis prix et ville, puis la
 * note et le dernier avis. Toucher
 * une offre ouvre sa fiche.
 */
export function BrowseScreen() {
  const { t } = useI18n();
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  // Les filtres choisis, gardés tant que l'app est ouverte (décision 2026-11-19-contrat-filtres-vitrine).
  const filters = useListFilters(BROWSE_LIST);
  const query = useListDefinition(BROWSE_LIST, search, filters.values);
  const filterFields = query.data?.filters;

  useEffect(() => {
    if (filterFields) {
      setFilterFields(BROWSE_LIST, filterFields);
    }
  }, [filterFields]);
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
      renderItem={(item) => <OfferCard item={item} testIDPrefix="browse-item" />}
      hasMore={query.hasNextPage}
      onLoadMore={() => query.fetchNextPage()}
      loadingMore={query.isFetchingNextPage}
      loadingMoreLabel={t('list.loading')}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      empty={Object.keys(filters.values).length > 0 ? t('list.noFilterResults') : search ? t('list.noResults') : definition.empty}
      search={definition.search ? { value: searchText, onChange: setSearchText, placeholder: definition.search } : null}
      filter={
        definition.filters && definition.filters.length > 0
          ? {
              label: t('list.filters'),
              count: activeFilterCount(definition.filters, filters.values),
              onPress: () => router.push({ pathname: '/filters/[list]', params: { list: BROWSE_LIST } }),
            }
          : null
      }
      // Sous les filtres, le nombre d'offres trouvées, centré (« 12 logements », décisions 2026-11-25-recherche-nombre
      // et 2026-11-25-nombre-centre).
      header={
        definition.heading?.title ? (
          <ThemedText type="smallBold" style={styles.heading} testID="browse-heading">
            {definition.heading.title}
          </ThemedText>
        ) : null
      }
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four },
  heading: { textAlign: 'center' },
});
