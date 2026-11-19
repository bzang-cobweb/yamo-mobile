import { useQueryClient } from '@tanstack/react-query';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { Spacing } from '@/shared/theme/theme';

import { listService } from '../services/ListService';
import type { ListItemFavorite } from '../types';

/** Rouge du cœur plein. */
export const HEART_COLOR = '#e5484d';

/**
 * Cœur de favori, posé sur une photo (décision 2026-11-19-contrat-vedette-favoris) :
 * le cœur seul, sans fond (décision 2026-11-19-acces-avis-backoffice), vide et blanc,
 * ou plein et rouge. Le toucher change aussitôt son état (mise à jour
 * optimiste), puis l'API confirme ; en cas d'échec, il revient et un message
 * s'affiche. Les listes et la fiche se rechargent ensuite.
 */
export function FavoriteHeart({ favorite, style, testID }: { favorite: ListItemFavorite; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  // L'état choisi ici, tant que l'API sert encore l'ancien (`from`) ; dès qu'elle
  // sert autre chose (liste ou fiche rechargée), son état l'emporte.
  const [optimistic, setOptimistic] = useState<{ from: boolean; value: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const active = optimistic && optimistic.from === favorite.active ? optimistic.value : favorite.active;

  async function toggle() {
    const next = !active;
    setOptimistic({ from: favorite.active, value: next });
    setBusy(true);

    try {
      await listService.setFavorite(favorite.endpoint, next);
      void queryClient.invalidateQueries({ queryKey: ['list'] });
      void queryClient.invalidateQueries({ queryKey: ['offer'] });
    } catch {
      setOptimistic(null);
      Alert.alert(t('error.unknown'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={active ? t('list.removeFavorite') : t('list.addFavorite')}
      accessibilityState={{ selected: active, busy }}
      disabled={busy}
      hitSlop={Spacing.two}
      onPress={() => void toggle()}
      style={({ pressed }) => [styles.heart, pressed && styles.pressed, style]}>
      <SymbolView
        name={active ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' } : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }}
        size={26}
        tintColor={active ? HEART_COLOR : '#ffffff'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heart: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
