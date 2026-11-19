import { StyleSheet, View } from 'react-native';

import { ItemPhoto } from '@/shared/components/ItemPhoto';

import type { ListItem } from '../types';
import { FavoriteHeart } from './FavoriteHeart';

/**
 * La photo d'un item, et son cœur de favori en haut à droite quand l'API en sert un
 * (décision 2026-11-19-contrat-vedette-favoris).
 */
export function ItemPicture({ item, placeholder = false, testID }: { item: Pick<ListItem, 'image' | 'favorite'>; placeholder?: boolean; testID: string }) {
  if (!item.favorite) {
    return <ItemPhoto uri={item.image} placeholder={placeholder} testID={`${testID}-photo`} />;
  }

  return (
    <View style={styles.wrap} testID={`${testID}-picture`}>
      <ItemPhoto uri={item.image} placeholder testID={`${testID}-photo`} />
      <FavoriteHeart favorite={item.favorite} testID={`${testID}-favorite`} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
