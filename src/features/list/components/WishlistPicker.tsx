import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { ApiError } from '@/shared/api/errors';
import { SheetBar } from '@/shared/components/SheetBar';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { BRAND_FONTS, Spacing } from '@/shared/theme/theme';

import { listService } from '../services/ListService';
import type { FavoriteTarget } from '../types';

/** Le côté de la photo d'une liste dans le panneau. */
const LIST_PHOTO = 56;

type Props = {
  /** Le point d'API du cœur (`/v1/offers/12/favorite`), servi par l'API. */
  endpoint: string;
  /** L'offre est rangée : fermer le panneau, remplir le cœur. */
  onSaved: () => void;
  /** Le titre du panneau, servi avec les listes. */
  onTitle?: (title: string) => void;
  testID?: string;
};

/**
 * Le contenu du panneau du cœur vide (décision 2026-11-27-listes-de-favoris) : les listes nommées du membre (sans
 * « Récemment consultés »), servies par l'API avec leurs textes ; toucher une liste y range l'offre. En bas, « Créer une
 * liste » ouvre un champ de nom et son bouton : la liste est créée et l'offre y est rangée, d'un seul envoi. Une
 * erreur (nom trop long, liste disparue) s'affiche sous le champ, sinon en haut.
 */
export function WishlistPicker({ endpoint, onSaved, onTitle, testID = 'wishlist-picker' }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const panel = useQuery({ queryKey: ['favorite-panel', endpoint], queryFn: () => listService.favoritePanel(endpoint), gcTime: 0 });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const servedTitle = panel.data?.title;

  useEffect(() => {
    if (servedTitle) {
      onTitle?.(servedTitle);
    }
  }, [servedTitle, onTitle]);

  async function save(target: FavoriteTarget) {
    setBusy(true);
    setError(null);

    try {
      await listService.setFavorite(endpoint, true, target);
      onSaved();
    } catch (caught) {
      // Le message de l'API (« Le nom de la liste ne doit pas dépasser 60 caractères. »), sinon générique.
      setError(caught instanceof ApiError ? (Object.values(caught.errors)[0]?.[0] ?? caught.message) : t('error.unknown'));
    } finally {
      setBusy(false);
    }
  }

  if (panel.isPending) {
    return (
      <View style={styles.center} accessibilityLabel={t('list.loading')} testID={`${testID}-loading`}>
        <ActivityIndicator />
      </View>
    );
  }

  if (panel.isError) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.error} accessibilityRole="alert">
          {t('error.unknown')}
        </ThemedText>
        <Pressable accessibilityRole="button" testID={`${testID}-retry`} onPress={() => panel.refetch()}>
          <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
        </Pressable>
      </View>
    );
  }

  const { create, lists } = panel.data;
  const trimmed = name.trim();

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.lists} keyboardShouldPersistTaps="handled" testID={`${testID}-lists`}>
        {error && !creating && (
          <ThemedText style={styles.error} accessibilityRole="alert" testID={`${testID}-error`}>
            {error}
          </ThemedText>
        )}
        {lists.map((list) => (
          <Pressable
            key={list.id}
            testID={`${testID}-list-${list.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${list.name}, ${list.subtitle}`}
            disabled={busy}
            onPress={() => void save({ wishlist: list.id })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            {/* La photo de la dernière offre rangée ; sans photo, un carré neutre. */}
            {list.image ? (
              <Image source={{ uri: list.image }} style={styles.photo} contentFit="cover" accessibilityIgnoresInvertColors testID={`${testID}-list-${list.id}-photo`} />
            ) : (
              <View style={[styles.photo, { backgroundColor: theme.backgroundElement }]} testID={`${testID}-list-${list.id}-empty`} />
            )}
            <View style={styles.text}>
              <ThemedText type="smallBold">{list.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {list.subtitle}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {/* En bas du panneau : « Créer une liste », puis le nom de la nouvelle liste et son bouton. */}
      <SheetBar testID={`${testID}-bar`}>
        {creating ? (
          <>
            <TextInput
              testID={`${testID}-name`}
              value={name}
              onChangeText={setName}
              placeholder={create.placeholder}
              accessibilityLabel={create.placeholder}
              placeholderTextColor={theme.textSecondary}
              maxLength={create.max_length}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => trimmed && void save({ name: trimmed })}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            {error && (
              <ThemedText style={styles.error} accessibilityRole="alert" testID={`${testID}-error`}>
                {error}
              </ThemedText>
            )}
            <Pressable
              testID={`${testID}-submit`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !trimmed || busy, busy }}
              disabled={!trimmed || busy}
              onPress={() => void save({ name: trimmed })}
              style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, (!trimmed || busy) && styles.disabled, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                {create.submit}
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <Pressable
            testID={`${testID}-create`}
            accessibilityRole="button"
            onPress={() => {
              setError(null);
              setCreating(true);
            }}
            style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {create.label}
            </ThemedText>
          </Pressable>
        )}
      </SheetBar>
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four },
  // Les listes défilent quand elles dépassent ; la barre de création reste en bas.
  scroll: { flexShrink: 1 },
  lists: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.one },
  photo: { width: LIST_PHOTO, height: LIST_PHOTO, borderRadius: 8 },
  text: { flex: 1, gap: Spacing.half },
  input: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 17, fontFamily: BRAND_FONTS[500] },
  button: { alignItems: 'center', borderRadius: 8, paddingVertical: Spacing.three },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.6 },
  error: { color: ERROR_COLOR },
});
