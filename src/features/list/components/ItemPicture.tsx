import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ItemPhoto } from '@/shared/components/ItemPhoto';
import { STATUS_ON_IMAGE, STATUS_ON_IMAGE_LEFT, StatusTag, type StatusTagValue } from '@/shared/components/StatusTag';
import { Spacing } from '@/shared/theme/theme';

import type { ListItem } from '../types';
import { FavoriteHeart } from './FavoriteHeart';

/**
 * La photo d'un item, et son cœur de favori en haut à droite quand l'API en sert un
 * (décision 2026-11-19-contrat-vedette-favoris) ; la pastille de statut `tag` quand elle est
 * servie : à la place du cœur sans cœur (décision 2026-11-21-statut-a-la-place-du-coeur), en haut
 * à gauche avec un cœur ou `tagLeft` (décision 2026-11-21-reservations-statut-coeur) ; une croix qui retire l'item, à
 * la place du cœur, quand son retrait est servi sur la photo (décision 2026-11-27-listes-de-favoris).
 */
export function ItemPicture({
  item,
  tag = null,
  tagLeft = false,
  placeholder = false,
  onRemove,
  testID,
}: {
  item: Pick<ListItem, 'image' | 'favorite' | 'image_fit'> & Partial<Pick<ListItem, 'delete'>>;
  /** La croix sur la photo (`delete.on_image`, « Récemment consultés », décision 2026-11-27-listes-de-favoris) : retirer l'item. */
  onRemove?: () => void;
  tag?: StatusTagValue | null;
  /** La pastille en haut à gauche (le haut à droite porte le menu de la carte, décision 2026-11-21-menu-en-haut-a-droite). */
  tagLeft?: boolean;
  placeholder?: boolean;
  testID: string;
}) {
  // Une croix en haut à droite, à la place du cœur, qui retire l'item aussitôt.
  const cross = item.delete?.on_image && onRemove ? item.delete : null;

  if (!item.favorite && !tag && !cross) {
    return <ItemPhoto uri={item.image} placeholder={placeholder} contain={item.image_fit === 'contain'} testID={`${testID}-photo`} />;
  }

  return (
    <View style={styles.wrap} testID={`${testID}-picture`}>
      <ItemPhoto uri={item.image} placeholder contain={item.image_fit === 'contain'} testID={`${testID}-photo`} />
      {item.favorite && !cross && <FavoriteHeart favorite={item.favorite} testID={`${testID}-favorite`} />}
      {cross && (
        <Pressable
          testID={`${testID}-remove`}
          accessibilityRole="button"
          accessibilityLabel={cross.label}
          hitSlop={Spacing.two}
          onPress={onRemove}
          style={({ pressed }) => [styles.cross, pressed && styles.pressed]}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} tintColor="#000000" />
        </Pressable>
      )}
      {tag && <StatusTag tag={tag} style={tagLeft || item.favorite ? STATUS_ON_IMAGE_LEFT : STATUS_ON_IMAGE} testID={`${testID}-status`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  // Une pastille blanche ronde, lisible sur n'importe quelle photo, à la place du cœur.
  cross: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pressed: { opacity: 0.7 },
});
