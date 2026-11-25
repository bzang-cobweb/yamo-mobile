import { Image } from 'expo-image';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ItemPhoto } from '@/shared/components/ItemPhoto';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { PhotoGallery, type GalleryAction } from './PhotoGallery';

/**
 * Photos d'une offre en carrousel horizontal, pleine largeur, au format 16:9, avec
 * la position (« 1 / 2 ») ; sans photo, un emplacement neutre (décision
 * 2026-11-18-fiche-offre). Toucher une photo ouvre la galerie plein écran sur elle, avec `gallery` (les mêmes photos
 * en grand), sinon les photos du carrousel ; la fermer ramène le carrousel sur la dernière photo vue (décision
 * 2026-11-25-galerie-plein-ecran).
 */
export function PhotoCarousel({
  photos,
  gallery,
  width,
  action,
}: {
  photos: string[];
  gallery?: string[];
  width: number;
  /** Le bouton « Réserver » de la fiche, repris dans la zone fixe du bas de la galerie. */
  action?: GalleryAction | null;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // Une API plus ancienne n'envoie pas `gallery` ; une liste qui ne correspond pas non plus.
  const large = gallery && gallery.length === photos.length ? gallery : photos;

  if (photos.length === 0) {
    return <ItemPhoto uri={null} placeholder testID="offer-photos" />;
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
    // Bornée : un défilement au-delà du bord reste sur la première ou la dernière photo.
    setIndex(Math.min(Math.max(page, 0), photos.length - 1));
  }

  function closeGallery(seen: number) {
    setGalleryOpen(false);
    setIndex(seen);
    scroll.current?.scrollTo({ x: seen * width, animated: false });
  }

  return (
    <View>
      <ScrollView
        ref={scroll}
        testID="offer-photos"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}>
        {photos.map((uri, position) => (
          <Pressable
            key={uri}
            accessibilityRole="imagebutton"
            testID={`offer-photo-open-${position}`}
            onPress={() => {
              setIndex(position);
              setGalleryOpen(true);
            }}>
            <Image
              testID={`offer-photo-${position}`}
              source={{ uri }}
              style={{ width, aspectRatio: 16 / 9 }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        ))}
      </ScrollView>
      {photos.length > 1 && (
        <View style={styles.position}>
          <ThemedText type="small" style={styles.positionText} testID="offer-photo-position">
            {t('offer.photoPosition', { current: index + 1, total: photos.length })}
          </ThemedText>
        </View>
      )}
      <PhotoGallery photos={large} thumbnails={photos} initialIndex={index} visible={galleryOpen} onClose={closeGallery} action={action} />
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
