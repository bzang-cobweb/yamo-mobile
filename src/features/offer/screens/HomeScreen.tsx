import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { setFilterValues } from '@/features/list/utils/filters';
import { PartnersStrip } from '@/features/partner/components/PartnersStrip';
import { usePartners } from '@/features/partner/hooks/usePartners';
import { NetworkError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { OfferCard } from '../components/OfferCard';
import { useHomeCarousels, useHomeFeatured } from '../hooks/useHomeCarousels';
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
  // En haut, avant les villes (décision 2026-11-25-bloc-a-la-une).
  const featured = useHomeFeatured().data ?? [];
  // L'espace des partenaires, en bas (décision 2026-11-23-module-partenaires) ; sans eux, l'accueil reste.
  const partners = usePartners();
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  // La largeur utile, moins les marges et l'espace entre les cartes, partagée en deux.
  const cardWidth = (Math.min(width, MaxContentWidth / 2) - 2 * Spacing.four - (VISIBLE_CARDS - 1) * Spacing.two) / VISIBLE_CARDS;

  /** « Voir tout » : la recherche, filtrée sur la ville seule (décision 2026-11-23-accueil-voir-tout). */
  function seeAll(filter: Record<string, string>) {
    // Le filtre servi avec le carrousel : sa région (décision 2026-11-25-region-de-l-adresse).
    setFilterValues(BROWSE_LIST, filter);
    router.navigate('/search');
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([query.refetch(), partners.refetch()]);
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
      {featured.length > 0 && (
        // Pas un carrousel : les cartes des villes, deux par ligne, toutes visibles (décision 2026-11-25-bloc-a-la-une).
        <View style={styles.section} testID="home-featured">
          <View style={styles.heading}>
            <ThemedText type="smallBold">{t('home.featured')}</ThemedText>
          </View>
          <View style={styles.grid} testID="home-featured-grid">
            {featured.map((item) => (
              <OfferCard key={item.id} item={item} testIDPrefix="home-featured-item" style={{ width: cardWidth }} compact />
            ))}
          </View>
        </View>
      )}
      {query.data.map((carousel) => (
        <View key={carousel.title} style={styles.section} testID={`home-carousel-${carousel.title}`}>
          <View style={styles.heading}>
            <ThemedText type="smallBold">{carousel.title}</ThemedText>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${t('home.seeAll')} ${carousel.title}`}
              hitSlop={Spacing.two}
              testID={`home-see-all-${carousel.title}`}
              onPress={() => seeAll(carousel.filter)}>
              {/* Une flèche, sans texte ; « Voir tout » reste annoncé aux lecteurs d'écran (décision 2026-11-23-accueil-fleche). */}
              <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} tintColor={theme.text} size={20} />
            </Pressable>
          </View>
          <FlatList
            // Un nouveau tirage repart du début : une liste horizontale garde sinon sa position de défilement, et le
            // nouveau tirage s'affichait décalé d'une carte (décision 2026-11-23-accueil-fleche-deux-cartes).
            key={carousel.items.map((item) => item.id).join(',')}
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
      <PartnersStrip partners={partners.data?.partners ?? []} become={partners.data?.become ?? null} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', paddingVertical: Spacing.four, gap: Spacing.four },
  section: { gap: Spacing.two },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.four },
  row: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.four, gap: Spacing.two },
});
