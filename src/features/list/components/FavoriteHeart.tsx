import { useQueryClient } from '@tanstack/react-query';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { BottomSheet } from '@/shared/components/BottomSheet';
import { useI18n } from '@/shared/i18n/I18nContext';
import { Spacing } from '@/shared/theme/theme';

import { listService } from '../services/ListService';
import type { ListItemFavorite } from '../types';
import { WishlistPicker } from './WishlistPicker';

/** Rouge du cœur plein. */
export const HEART_COLOR = '#e5484d';

/**
 * Cœur de favori, posé sur une photo (décision 2026-11-19-contrat-vedette-favoris) :
 * le cœur seul, sans fond (décision 2026-11-19-acces-avis-backoffice), vide et blanc,
 * ou plein et rouge. Vide, le toucher ouvre le panneau de ses listes de favoris, où l'on
 * choisit ou crée la liste (décision 2026-11-27-listes-de-favoris) ; rangée, le cœur se remplit.
 * Plein, le toucher retire l'offre de toutes ses listes, aussitôt (mise à jour optimiste),
 * puis l'API confirme ; en cas d'échec, il revient et un message s'affiche. Les listes,
 * la fiche et l'accueil se rechargent ensuite.
 */
export function FavoriteHeart({ favorite, style, testID }: { favorite: ListItemFavorite; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  // L'état choisi ici, tant que l'API sert encore l'ancien (`from`) ; dès qu'elle
  // sert autre chose (liste ou fiche rechargée), son état l'emporte.
  const [optimistic, setOptimistic] = useState<{ from: boolean; value: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const active = optimistic && optimistic.from === favorite.active ? optimistic.value : favorite.active;

  const [choosing, setChoosing] = useState(false);
  // Le titre du panneau, servi avec ses listes (« Enregistrer dans une liste ») ; en attendant, celui du cœur.
  const [panelTitle, setPanelTitle] = useState(t('list.addFavorite'));

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['list'] });
    void queryClient.invalidateQueries({ queryKey: ['offer'] });
    void queryClient.invalidateQueries({ queryKey: ['home-recent'] });
  }

  /** Le cœur plein : l'offre sort de toutes ses listes, aussitôt (décision 2026-11-27-listes-de-favoris). */
  async function remove() {
    setOptimistic({ from: favorite.active, value: false });
    setBusy(true);

    try {
      await listService.setFavorite(favorite.endpoint, false);
      refresh();
    } catch {
      setOptimistic(null);
      Alert.alert(t('error.unknown'));
    } finally {
      setBusy(false);
    }
  }

  /** Rangée dans une liste du panneau : le cœur se remplit, les listes se rechargent. */
  function saved() {
    setChoosing(false);
    setOptimistic({ from: favorite.active, value: true });
    refresh();
  }

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={active ? t('list.removeFavorite') : t('list.addFavorite')}
        accessibilityState={{ selected: active, busy }}
        disabled={busy}
        hitSlop={Spacing.two}
        // Vide : le panneau de ses listes ; plein : retirée de toutes (décision 2026-11-27-listes-de-favoris).
        onPress={() => (active ? void remove() : setChoosing(true))}
        style={({ pressed }) => [styles.heart, pressed && styles.pressed, style]}>
        <SymbolView
          name={active ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' } : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }}
          size={26}
          tintColor={active ? HEART_COLOR : '#ffffff'}
        />
      </Pressable>
      {/* À la hauteur de son contenu : ses listes, puis « Créer une liste » en bas. Ses touchers ne remontent pas à la
          carte qui porte le cœur (elle ouvrirait la fiche). */}
      <BottomSheet visible={choosing} title={panelTitle} onClose={() => setChoosing(false)} fitContent keepTouches testID={testID ? `${testID}-panel` : 'favorite-panel'}>
        {choosing && <WishlistPicker endpoint={favorite.endpoint} onSaved={saved} onTitle={setPanelTitle} testID={testID ? `${testID}-picker` : 'wishlist-picker'} />}
      </BottomSheet>
    </>
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
    // Une ombre autour du cœur, lisible sur une photo claire (décision 2026-11-19-ombre-coeur-onglets-offre).
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  pressed: { opacity: 0.7 },
});
