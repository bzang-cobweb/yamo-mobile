import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { setFilterValues } from '@/features/list/utils/filters';
import { NetworkError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { OfferCard } from '../components/OfferCard';
import { useHomeCarousels } from '../hooks/useHomeCarousels';
import { BROWSE_LIST } from './BrowseScreen';

/** Deux cartes côte à côte à l'écran (décision 2026-11-23-accueil-deux-cartes). */
const VISIBLE_CARDS = 2;

/**
 * L'accueil d'un membre connecté (décision 2026-11-23-accueil-carrousels-par-ville) : un carrousel par ville, le
 * nom de la ville au-dessus, 10 offres tirées au hasard qui défilent de côté, deux à l'écran, en cartes comme la recherche.
 * Tirer vers le bas fait un nouveau tirage.
 */
export function HomeScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const query = useHomeCarousels();
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  // La largeur utile, moins les marges et l'espace entre les cartes, partagée en deux.
  const cardWidth = (Math.min(width, MaxContentWidth / 2) - 2 * Spacing.four - (VISIBLE_CARDS - 1) * Spacing.two) / VISIBLE_CARDS;

  /** « Voir tout » : la recherche, filtrée sur la ville seule (décision 2026-11-23-accueil-voir-tout). */
  function seeAll(city: string) {
    setFilterValues(BROWSE_LIST, { city });
    router.navigate('/search');
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  if (query.isPending) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator accessibilityLabel={t('list.loading')} />
      </ThemedView>
    );
  }

  if (query.isError) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="textSecondary">{query.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}</ThemedText>
        <Pressable accessibilityRole="button" testID="home-retry" onPress={() => query.refetch()}>
          <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      testID="home-screen"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      {query.data.map((carousel) => (
        <View key={carousel.city} style={styles.section} testID={`home-carousel-${carousel.city}`}>
          <View style={styles.heading}>
            <ThemedText type="smallBold">{carousel.city}</ThemedText>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${t('home.seeAll')} ${carousel.city}`}
              hitSlop={Spacing.two}
              testID={`home-see-all-${carousel.city}`}
              onPress={() => seeAll(carousel.city)}>
              {/* Une flèche, sans texte ; « Voir tout » reste annoncé aux lecteurs d'écran (décision 2026-11-23-accueil-fleche). */}
              <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} tintColor={theme.text} size={20} />
            </Pressable>
          </View>
          <FlatList
            horizontal
            data={carousel.items}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            // Défile carte par carte.
            snapToInterval={cardWidth + Spacing.two}
            decelerationRate="fast"
            renderItem={({ item }) => <OfferCard item={item} testIDPrefix="home-item" style={{ width: cardWidth }} compact />}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', paddingVertical: Spacing.four, gap: Spacing.four },
  section: { gap: Spacing.two },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.four },
  row: { paddingHorizontal: Spacing.four, gap: Spacing.two },
});
