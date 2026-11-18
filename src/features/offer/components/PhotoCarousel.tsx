import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ItemPhoto } from '@/shared/components/ItemPhoto';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

/**
 * Photos d'une offre en carrousel horizontal, pleine largeur, au format 16:9, avec
 * la position (« 1 / 2 ») ; sans photo, un emplacement neutre (décision
 * 2026-11-18-fiche-offre).
 */
export function PhotoCarousel({ photos, width }: { photos: string[]; width: number }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return <ItemPhoto uri={null} placeholder testID="offer-photos" />;
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
    // Bornée : un défilement au-delà du bord reste sur la première ou la dernière photo.
    setIndex(Math.min(Math.max(page, 0), photos.length - 1));
  }

  return (
    <View>
      <ScrollView
        testID="offer-photos"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}>
        {photos.map((uri, position) => (
          <Image
            key={uri}
            testID={`offer-photo-${position}`}
            source={{ uri }}
            style={{ width, aspectRatio: 16 / 9 }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ))}
      </ScrollView>
      {photos.length > 1 && (
        <View style={styles.position}>
          <ThemedText type="small" style={styles.positionText} testID="offer-photo-position">
            {t('offer.photoPosition', { current: index + 1, total: photos.length })}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  positionText: { color: '#ffffff' },
});
