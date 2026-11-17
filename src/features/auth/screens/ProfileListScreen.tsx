import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { useListDefinition } from '@/features/list/hooks/useListDefinition';
import type { ListItem } from '@/features/list/types';
import { NetworkError } from '@/shared/api/errors';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';
import { profileFormService, profileSubmission } from '../services/ProfileFormService';
import { takeProfileNotice } from '../utils/profile-notice';
import { ProfileScreenShell } from './ProfileFormScreen';

/**
 * Écran de toute liste du profil (`/profile/lists/[list]`), sans la connaître
 * d'avance (décision 2026-11-18-adresses-liste-generique) : l'API en donne le
 * titre, affiché dans l'en-tête, le texte d'une liste vide, le bouton de
 * création et les items.
 *
 * - Le bouton de création ouvre son formulaire (`/profile/[form]`).
 * - Toucher un item ouvre son formulaire lié à l'enregistrement (`?record=`).
 * - Le bouton de retrait d'un item demande confirmation, envoie le retrait décrit
 *   par l'API, puis affiche son message. Un retrait que l'app ne sait pas
 *   exécuter (méthode, point d'API ou suite inconnus) n'est pas proposé.
 *
 * La liste se recharge à chaque retour sur l'écran, et affiche alors la
 * confirmation du formulaire enregistré.
 */
export function ProfileListScreen({ list }: { list: string }) {
  const { t } = useAuth();
  const theme = useTheme();
  const query = useListDefinition(list);
  const { refetch } = query;
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      setNotice(takeProfileNotice());
      setError(null);

      return () => setNotice(null);
    }, [refetch]),
  );

  async function remove(item: ListItem) {
    const submission = item.delete ? profileSubmission(item.delete) : null;

    if (submission === null) {
      return;
    }

    setError(null);

    try {
      await profileFormService.submit(submission, {});
      setNotice(submission.success.message);
    } catch {
      setNotice(null);
      setError(t('error.unknown'));
    }

    await refetch();
  }

  function confirmRemove(item: ListItem) {
    if (!item.delete) {
      return;
    }

    Alert.alert(item.delete.confirm, undefined, [
      { text: t('list.cancel'), style: 'cancel' },
      { text: item.delete.label, style: 'destructive', onPress: () => void remove(item) },
    ]);
  }

  const definition = query.data;

  return (
    <ProfileScreenShell title={definition?.title ?? ''}>
      {query.isPending ? (
        <View style={styles.center} accessibilityLabel={t('list.loading')}>
          <ActivityIndicator />
        </View>
      ) : query.isError || !definition ? (
        <View style={styles.center}>
          <ThemedText style={styles.error} accessibilityRole="alert">
            {query.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}
          </ThemedText>
          <Pressable accessibilityRole="button" testID="profile-list-retry" onPress={() => refetch()}>
            <ThemedText type="linkPrimary">{query.error instanceof NetworkError ? t('offline.retry') : t('form.retry')}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          {notice && (
            <ThemedText type="small" themeColor="textSecondary" accessibilityRole="alert" testID="profile-list-notice">
              {notice}
            </ThemedText>
          )}
          {error && (
            <ThemedText type="small" style={styles.error} accessibilityRole="alert" testID="profile-list-error">
              {error}
            </ThemedText>
          )}
          {definition.items.length === 0 && definition.empty && (
            <ThemedText themeColor="textSecondary" style={styles.empty} testID="profile-list-empty">
              {definition.empty}
            </ThemedText>
          )}
          <View style={styles.items}>
            {definition.items.map((item) => {
              const edit = item.edit;
              const removable = item.delete !== null && profileSubmission(item.delete) !== null;

              return (
                <View key={item.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
                  <Pressable
                    testID={`profile-list-item-${item.id}`}
                    accessibilityRole={edit ? 'link' : undefined}
                    disabled={!edit}
                    onPress={() =>
                      edit && router.push({ pathname: '/profile/[form]', params: { form: edit.form, record: edit.record } })
                    }
                    style={({ pressed }) => [styles.itemText, pressed && styles.pressed]}>
                    <ThemedText>{item.title}</ThemedText>
                    {item.subtitle && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.subtitle}
                      </ThemedText>
                    )}
                  </Pressable>
                  {removable && item.delete && (
                    <Pressable
                      testID={`profile-list-delete-${item.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.delete.label} ${item.title}`}
                      onPress={() => confirmRemove(item)}
                      style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
                      <ThemedText type="small" style={styles.error}>
                        {item.delete.label}
                      </ThemedText>
                    </Pressable>
                  )}
                  {edit && (
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                      size={16}
                      tintColor={theme.textSecondary}
                    />
                  )}
                </View>
              );
            })}
          </View>
          {definition.create && (
            <Pressable
              testID="profile-list-create"
              accessibilityRole="button"
              onPress={() =>
                definition.create && router.push({ pathname: '/profile/[form]', params: { form: definition.create.form } })
              }
              style={({ pressed }) => [styles.create, pressed && styles.pressed]}>
              <ThemedText type="linkPrimary">{definition.create.label}</ThemedText>
            </Pressable>
          )}
        </>
      )}
    </ProfileScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  error: { color: ERROR_COLOR },
  empty: { textAlign: 'center' },
  items: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  itemText: { flex: 1, gap: Spacing.half, paddingVertical: Spacing.one },
  delete: { padding: Spacing.one },
  create: { alignSelf: 'center', padding: Spacing.two },
  pressed: { opacity: 0.6 },
});
