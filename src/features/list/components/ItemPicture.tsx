import { StyleSheet, View } from 'react-native';

import { ItemPhoto } from '@/shared/components/ItemPhoto';
import { STATUS_ON_IMAGE, STATUS_ON_IMAGE_LEFT, StatusTag, type StatusTagValue } from '@/shared/components/StatusTag';

import type { ListItem } from '../types';
import { FavoriteHeart } from './FavoriteHeart';

/**
 * La photo d'un item, et son cœur de favori en haut à droite quand l'API en sert un
 * (décision 2026-11-19-contrat-vedette-favoris) ; la pastille de statut `tag` quand elle est
 * servie : à la place du cœur sans cœur (décision 2026-11-21-statut-a-la-place-du-coeur), en haut
 * à gauche avec un cœur ou `tagLeft` (décision 2026-11-21-reservations-statut-coeur).
 */
export function ItemPicture({
  item,
  tag = null,
  tagLeft = false,
  placeholder = false,
  testID,
}: {
  item: Pick<ListItem, 'image' | 'favorite' | 'image_fit'>;
  tag?: StatusTagValue | null;
  /** La pastille en haut à gauche (le haut à droite porte le menu de la carte, décision 2026-11-21-menu-en-haut-a-droite). */
  tagLeft?: boolean;
  placeholder?: boolean;
  testID: string;
}) {
  if (!item.favorite && !tag) {
    return <ItemPhoto uri={item.image} placeholder={placeholder} contain={item.image_fit === 'contain'} testID={`${testID}-photo`} />;
  }

  return (
    <View style={styles.wrap} testID={`${testID}-picture`}>
      <ItemPhoto uri={item.image} placeholder contain={item.image_fit === 'contain'} testID={`${testID}-photo`} />
      {item.favorite && <FavoriteHeart favorite={item.favorite} testID={`${testID}-favorite`} />}
      {tag && <StatusTag tag={tag} style={tagLeft || item.favorite ? STATUS_ON_IMAGE_LEFT : STATUS_ON_IMAGE} testID={`${testID}-status`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
