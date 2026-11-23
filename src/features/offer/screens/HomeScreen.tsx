import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { NetworkError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { OfferCard } from '../components/OfferCard';
import { useHomeCarousels } from '../hooks/useHomeCarousels';

/** Une carte occupe ce part de la largeur : la suivante dépasse, on voit qu'on peut faire défiler. */
const CARD_SHARE = 0.8;

/**
 * L'accueil d'un membre connecté (décision 2026-11-23-accueil-carrousels-par-ville) : un carrousel par ville, le
 * nom de la ville au-dessus, 10 offres tirées au hasard qui défilent de côté, en cartes comme la recherche.
 * Tirer vers le bas fait un nouveau tirage.
 */
export function HomeScreen() {
  const { t } = useI18n();
  const query = useHomeCarousels();
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width, MaxContentWidth / 2) * CARD_SHARE;

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
          <ThemedText type="smallBold" style={styles.city}>
            {carousel.city}
          </ThemedText>
          <FlatList
            horizontal
            data={carousel.items}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            // Défile carte par carte.
            snapToInterval={cardWidth + Spacing.two}
            decelerationRate="fast"
            renderItem={({ item }) => <OfferCard item={item} testIDPrefix="home-item" style={{ width: cardWidth }} />}
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
  city: { paddingHorizontal: Spacing.four },
  row: { paddingHorizontal: Spacing.four, gap: Spacing.two },
});
