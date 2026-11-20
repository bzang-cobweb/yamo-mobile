import { StyleSheet, View } from 'react-native';

import { ItemPhoto } from '@/shared/components/ItemPhoto';
import { STATUS_ON_IMAGE, StatusTag, type StatusTagValue } from '@/shared/components/StatusTag';

import type { ListItem } from '../types';
import { FavoriteHeart } from './FavoriteHeart';

/**
 * La photo d'un item, et son cœur de favori en haut à droite quand l'API en sert un
 * (décision 2026-11-19-contrat-vedette-favoris) ; sans cœur, à cette place, la pastille
 * de statut `tag` quand elle est servie (décision 2026-11-21-statut-a-la-place-du-coeur).
 */
export function ItemPicture({
  item,
  tag = null,
  placeholder = false,
  testID,
}: {
  item: Pick<ListItem, 'image' | 'favorite'>;
  tag?: StatusTagValue | null;
  placeholder?: boolean;
  testID: string;
}) {
  if (!item.favorite && !tag) {
    return <ItemPhoto uri={item.image} placeholder={placeholder} testID={`${testID}-photo`} />;
  }

  return (
    <View style={styles.wrap} testID={`${testID}-picture`}>
      <ItemPhoto uri={item.image} placeholder testID={`${testID}-photo`} />
      {item.favorite ? (
        <FavoriteHeart favorite={item.favorite} testID={`${testID}-favorite`} />
      ) : (
        tag && <StatusTag tag={tag} style={STATUS_ON_IMAGE} testID={`${testID}-status`} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
