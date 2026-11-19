import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { FixedButtonBar } from '@/shared/components/FixedButtonBar';
import { Quote } from '@/shared/components/Quote';
import { StatusTag } from '@/shared/components/StatusTag';
import { useListDefinition } from '@/features/list/hooks/useListDefinition';
import type { ListItem, ListItemCounter } from '@/features/list/types';
import { activeFilterCount, setFilterFields, setFilterValues, useListFilters } from '@/features/list/utils/filters';
import { NetworkError } from '@/shared/api/errors';
import { ItemActionButtons } from '@/features/list/components/ItemActionButtons';
import { ItemPicture } from '@/features/list/components/ItemPicture';
import { useItemActions } from '@/features/list/hooks/useItemActions';
import { ITEM_LINK } from '@/features/list/services/ListService';
import { ItemReviews } from '@/features/list/components/ItemReviews';
import { List } from '@/shared/components/List';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';
import { profileFormService, profileSubmission } from '../services/ProfileFormService';
import { takeProfileNotice } from '../utils/profile-notice';
import { profileContentStyle, ProfileScreenShell } from './ProfileFormScreen';

/**
 * Écran de toute liste du profil (`/profile/lists/[list]`), sans la connaître
 * d'avance (décision 2026-11-18-adresses-liste-generique) : l'API en donne le
 * titre, affiché dans l'en-tête, le texte d'une liste vide, le bouton de
 * création et les items.
 *
 * - Le lien de création, fixe sous la recherche et aligné à droite (décision
 *   2026-11-18-lien-creation-sous-recherche), ouvre son formulaire (`/profile/[form]`).
 * - Toucher un item ouvre son formulaire lié à l'enregistrement (`?record=`).
 * - Le bouton de retrait d'un item demande confirmation, envoie le retrait décrit
 *   par l'API, puis affiche son message. Un retrait que l'app ne sait pas
 *   exécuter (méthode, point d'API ou suite inconnus) n'est pas proposé.
 *
 * Les items arrivent par pages (décision 2026-11-18-contrat-liste-infinie-role-admin) :
 * la suite se charge en approchant du bas, avec le composant générique `List`.
 * La liste repart de la première page à chaque retour sur l'écran, après un
 * retrait, et quand on la tire vers le bas ; au retour d'un formulaire
 * enregistré, elle en affiche la confirmation.
 *
 * Une liste cherchable (`search` servi par l'API) affiche un champ de recherche ;
 * la recherche part 300 ms après la dernière frappe, côté serveur (décision
 * 2026-11-18-recherche-dans-la-liste).
 *
 * Décrits par l'API aussi (décision 2026-11-19-contrat-reservations-logements-profil) :
 * les filtres (lien « Filtres », comme l'accueil), un bouton fixe en bas (un
 * formulaire, ou un écran de l'app), des boutons sur une carte (« Accepter »,
 * « Refuser »), et un compteur de carte qui ouvre une autre liste déjà filtrée.
 */
export function ProfileListScreen({ list }: { list: string }) {
  const { t } = useAuth();
  const theme = useTheme();
  const [searchText, setSearchText] = useState('');
  const search = useDebounced(searchText.trim(), SEARCH_DELAY);
  const filters = useListFilters(list);
  const query = useListDefinition(list, search, filters.values);
  const insets = useSafeAreaInsets();
  const filterFields = query.data?.filters;

  useEffect(() => {
    if (filterFields) {
      setFilterFields(list, filterFields);
    }
  }, [list, filterFields]);
  const { reload, refetch } = query;
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Au premier affichage, la requête part déjà : ne recharger qu'aux retours.
  const shown = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (shown.current) {
        void reload();
      }
      shown.current = true;
      setNotice(takeProfileNotice());
      setError(null);

      return () => setNotice(null);
    }, [reload]),
  );

  async function refresh() {
    setRefreshing(true);

    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }

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

    await reload();
  }

  // Un bouton de carte : un formulaire, un écran, ou un envoi après confirmation.
  const { press: pressAction } = useItemActions({ onNotice: setNotice, onError: setError, onDone: reload });

  // Le compteur ouvre sa liste avec ses filtres déjà choisis.
  function openCounter(counter: ListItemCounter) {
    setFilterValues(counter.list, counter.filter);
    router.push({ pathname: '/profile/lists/[list]', params: { list: counter.list } });
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

  function renderItem(item: ListItem) {
    const edit = item.edit;
    // L'écran de l'app que l'item désigne (« /offers/12 », décision 2026-11-19-contrat-vedette-favoris).
    const link = item.link && ITEM_LINK.test(item.link) ? item.link : null;
    const removable = item.delete !== null && profileSubmission(item.delete) !== null;
    // Un formulaire et un écran : « Voir » et « Éditer » (décision 2026-11-19-nuit-voir-editer-retirer).
    const both = Boolean(edit && link);
    // Avec une photo, ou des boutons : en colonne, la photo sur toute la largeur et les actions sur leur ligne
    // (décision 2026-11-19-nuit-retirer-sous-image).
    const stacked = Boolean(item.image) || both;

    function openEdit() {
      if (edit) {
        router.push({ pathname: '/profile/[form]', params: { form: edit.form, record: edit.record } });
      }
    }

    function openLink() {
      if (link) {
        router.push(link as Href);
      }
    }

    const removeButton = removable && item.delete && (
      <Pressable
        testID={`profile-list-delete-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${item.delete.label} ${item.title}`}
        hitSlop={Spacing.one}
        onPress={() => confirmRemove(item)}
        style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
        <ThemedText type="small" style={styles.error}>
          {item.delete.label}
        </ThemedText>
      </Pressable>
    );

    return (
      <View style={[styles.row, stacked && styles.stacked, { borderColor: theme.backgroundSelected }]} testID={`profile-list-row-${item.id}`}>
        <Pressable
          testID={`profile-list-item-${item.id}`}
          accessibilityRole={edit || link ? 'link' : undefined}
          disabled={!edit && !link}
          onPress={() => (edit ? openEdit() : openLink())}
          style={({ pressed }) => [styles.itemText, pressed && styles.pressed]}>
          {/* La photo de l'item, s'il en a une, au-dessus du titre ; son cœur de favori. */}
          <ItemPicture item={item} testID={`profile-list-item-${item.id}`} />
          {item.tag && <StatusTag tag={item.tag} testID={`profile-list-tag-${item.id}`} />}
          <ThemedText>{item.title}</ThemedText>
          {item.subtitle && (
            <ThemedText type="small" themeColor="textSecondary">
              {item.subtitle}
            </ThemedText>
          )}
          {item.quote && <Quote text={item.quote} testID={`profile-list-quote-${item.id}`} />}
          {/* La note et la phrase mise en avant, quand l'API les sert. */}
          <ItemReviews item={item} testID={`profile-list-item-${item.id}`} />
        </Pressable>
        {item.counter && (
          <Pressable
            testID={`profile-list-counter-${item.id}`}
            accessibilityRole="link"
            onPress={() => item.counter && openCounter(item.counter)}
            style={({ pressed }) => [styles.counter, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {item.counter.label}
            </ThemedText>
          </Pressable>
        )}
        <ItemActionButtons actions={item.actions ?? []} testID={`profile-list-action-${item.id}`} onPress={pressAction} />
        {stacked ? (
          <View style={styles.actions} testID={`profile-list-actions-${item.id}`}>
            {both && (
              <>
                <Pressable
                  testID={`profile-list-view-${item.id}`}
                  accessibilityRole="link"
                  accessibilityLabel={`${t('list.view')} ${item.title}`}
                  hitSlop={Spacing.one}
                  onPress={openLink}
                  style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
                  <ThemedText type="linkPrimary">{t('list.view')}</ThemedText>
                </Pressable>
                <Pressable
                  testID={`profile-list-edit-${item.id}`}
                  accessibilityRole="link"
                  accessibilityLabel={`${t('list.edit')} ${item.title}`}
                  hitSlop={Spacing.one}
                  onPress={openEdit}
                  style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
                  <ThemedText type="linkPrimary">{t('list.edit')}</ThemedText>
                </Pressable>
              </>
            )}
            {removeButton}
          </View>
        ) : (
          removeButton
        )}
      </View>
    );
  }

  if (query.isPending || query.isError || !definition) {
    return (
      <ProfileScreenShell title={definition?.title ?? ''}>
        {query.isPending ? (
          <View style={styles.center} accessibilityLabel={t('list.loading')}>
            <ActivityIndicator />
          </View>
        ) : (
          <View style={styles.center}>
            <ThemedText style={styles.error} accessibilityRole="alert">
              {query.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}
            </ThemedText>
            <Pressable accessibilityRole="button" testID="profile-list-retry" onPress={() => refetch()}>
              <ThemedText type="linkPrimary">{query.error instanceof NetworkError ? t('offline.retry') : t('form.retry')}</ThemedText>
            </Pressable>
          </View>
        )}
      </ProfileScreenShell>
    );
  }

  return (
    <ProfileScreenShell title={definition.title} scrolls={false}>
      <List
        testID="profile-list"
        items={definition.items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        hasMore={query.hasNextPage}
        onLoadMore={() => query.fetchNextPage()}
        loadingMore={query.isFetchingNextPage}
        loadingMoreLabel={t('list.loading')}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        empty={Object.keys(filters.values).length > 0 ? t('list.noFilterResults') : search ? t('list.noResults') : definition.empty}
        search={definition.search ? { value: searchText, onChange: setSearchText, placeholder: definition.search } : null}
        filter={
          definition.filters && definition.filters.length > 0
            ? {
                label: t('list.filters'),
                count: activeFilterCount(definition.filters, filters.values),
                onPress: () => router.push({ pathname: '/filters/[list]', params: { list } }),
              }
            : null
        }
        contentContainerStyle={[profileContentStyle, !definition.footer && { paddingBottom: Math.max(insets.bottom, Spacing.four) }]}
        create={
          definition.create
            ? {
                label: definition.create.label,
                onPress: () =>
                  definition.create && router.push({ pathname: '/profile/[form]', params: { form: definition.create.form } }),
              }
            : null
        }
        header={
          notice || error ? (
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
            </>
          ) : null
        }
      />
      {/* Le bouton fixe en bas : un formulaire (« Ajouter un logement ») ou un écran (« Rechercher un logement »). */}
      {definition.footer && (
        <FixedButtonBar label={definition.footer.label} onPress={() => definition.footer && openFooter(definition.footer)} testID="profile-list-footer" />
      )}
    </ProfileScreenShell>
  );
}

/** Le bouton du bas : son formulaire, ou l'écran de l'app (l'accueil `/`, une fiche) ; jamais une adresse externe. */
function openFooter(footer: { form: string | null; link: string | null }) {
  if (footer.form) {
    router.push({ pathname: '/profile/[form]', params: { form: footer.form } });
  } else if (footer.link === '/') {
    router.navigate('/');
  } else if (footer.link && ITEM_LINK.test(footer.link)) {
    router.push(footer.link as Href);
  }
}

/** Pause après la dernière frappe avant d'envoyer la recherche. */
export const SEARCH_DELAY = 300;

/** `value`, une fois qu'il n'a plus changé pendant `delay` ms. */
function useDebounced(value: string, delay: number): string {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  error: { color: ERROR_COLOR },
  // Sans fond, une bordure (décision 2026-11-18-liste-bordure).
  row: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  // Un item avec photo : en colonne.
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  itemText: { flex: 1, gap: Spacing.half, paddingVertical: Spacing.one },
  delete: { padding: Spacing.one },
  // La ligne des actions, sous le contenu, à droite.
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.three },
  pressed: { opacity: 0.6 },
  counter: { alignSelf: 'flex-start', paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 12 },
});
