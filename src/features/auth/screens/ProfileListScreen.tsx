import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { BackHeader } from '@/shared/components/BackHeader';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { DropdownMenu } from '@/shared/components/DropdownMenu';
import { FixedButtonBar } from '@/shared/components/FixedButtonBar';
import { showToast } from '@/shared/components/Toast';
import { useListDefinition } from '@/features/list/hooks/useListDefinition';
import type { ListItem, ListItemAction } from '@/features/list/types';
import { activeFilterCount, isFixedFilter, setFilterFields, useListFilters } from '@/features/list/utils/filters';
import { openListFooter } from '@/features/list/utils/openListFooter';
import { NetworkError } from '@/shared/api/errors';
import { ListItemCard } from '@/features/list/components/ListItemCard';
import { useItemActions } from '@/features/list/hooks/useItemActions';
import { ActionPanel, knowsPanel } from '@/features/list/components/ActionPanel';
import { FilterSheet } from '@/features/list/components/FilterSheet';
import { List } from '@/shared/components/List';
import { SEARCH_DELAY, useDebounced } from '@/shared/hooks/useDebounced';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';
import { profileFormService, profileSubmission } from '../services/ProfileFormService';
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
/**
 * `headingType` : le style du titre en tête des items ; `subtitle`, celui du titre de la fiche d'une offre (la note de
 * la liste des avis, décision 2026-11-25-liste-avis-note-style-titre-fiche).
 */
export function ProfileListScreen({
  list,
  headingType = 'smallBold',
  bare = false,
}: {
  list: string;
  headingType?: 'smallBold' | 'subtitle';
  /** Sans cadre de page (barre du haut, retour) : la liste dans un panneau (les avis d'une offre, décision
   *  2026-11-27-reservations-oeil-voir). */
  bare?: boolean;
}) {
  const Shell = bare ? BareShell : ProfileScreenShell;
  const { t } = useAuth();
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
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // La carte dont le menu « Actions » est ouvert (décision 2026-11-21-actions-en-menu).
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Au premier affichage, la requête part déjà : ne recharger qu'aux retours.
  const shown = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (shown.current) {
        void reload();
      }
      shown.current = true;
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

    // Le message, réussite ou erreur, dans le bandeau flottant (décision 2026-11-21-bandeau-messages).
    try {
      await profileFormService.submit(submission, {});
      showToast(submission.success.message);
    } catch {
      showToast(t('error.unknown'), 'danger');
    }

    await reload();
  }

  // Un bouton de carte : un formulaire, un écran, ou un envoi après confirmation.
  // Le panneau d'une action, ouvert par-dessus la liste (décision 2026-11-27-action-panneau).
  const [panel, setPanel] = useState<ListItemAction | null>(null);
  // Un panneau que cette version de l'app ne connaît pas : rien.
  const { press: pressAction } = useItemActions({ onDone: reload, onPanel: (action) => action.panel && knowsPanel(action.panel.name) && setPanel(action) });

  // Un menu ⋮ ouvert se ferme au premier toucher ailleurs, qui ne fait rien d'autre (décision
  // 2026-11-21-menu-fermer-ailleurs) : vrai s'il y en avait un.
  function closeMenu(): boolean {
    if (openMenu === null) {
      return false;
    }
    setOpenMenu(null);

    return true;
  }

  function confirmRemove(item: ListItem) {
    if (!item.delete) {
      return;
    }
    // La croix sur la photo retire aussitôt, sans confirmation (« Récemment consultés », décision 2026-11-27-listes-de-favoris).
    if (item.delete.on_image) {
      void remove(item);

      return;
    }

    Alert.alert(item.delete.confirm, undefined, [
      { text: t('list.cancel'), style: 'cancel' },
      { text: item.delete.label, style: 'destructive', onPress: () => void remove(item) },
    ]);
  }

  // Le menu ⋮ de la barre du haut (« Renommer », « Supprimer » une liste de favoris, décision 2026-11-27-listes-de-favoris).
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  /** Une action du menu du haut : son formulaire, ou son envoi après confirmation ; « back » referme l'écran. */
  function pressHeaderAction(action: ListItemAction) {
    if (action.form) {
      router.push({ pathname: '/profile/[form]', params: { form: action.form.form, record: action.form.record } });

      return;
    }
    const submission = action.submission ? profileSubmission({ ...action.submission, label: action.label }) : null;
    if (submission === null) {
      return;
    }

    async function send() {
      if (submission === null) {
        return;
      }
      try {
        await profileFormService.submit(submission, {});
      } catch {
        showToast(t('error.unknown'), 'danger');

        return;
      }
      showToast(submission.success.message);
      // La liste supprimée : retour à l'écran d'avant, qui se recharge.
      if (submission.success.action === 'back') {
        router.back();
      } else {
        await reload();
      }
    }

    if (action.confirm) {
      Alert.alert(action.confirm, undefined, [
        { text: t('list.cancel'), style: 'cancel' },
        { text: action.label, style: action.style === 'destructive' ? 'destructive' : 'default', onPress: () => void send() },
      ]);
    } else {
      void send();
    }
  }

  const definition = query.data;
  const headerActions = bare ? [] : (definition?.header_actions ?? []);
  const headerMenu =
    headerActions.length > 0 ? (
      <DropdownMenu
        entries={headerActions.map((action, index) => ({ key: `header-${index}`, label: action.label, danger: action.style === 'destructive', onPress: () => pressHeaderAction(action) }))}
        open={headerMenuOpen}
        onOpenChange={(next) => {
          setOpenMenu(null);
          setHeaderMenuOpen(next);
        }}
        accessibilityLabel={`${t('list.actions')} ${definition?.title ?? ''}`}
        testID="profile-list-header-menu"
      />
    ) : null;

  function renderItem(item: ListItem) {
    return (
      <ListItemCard
        item={item}
        menu={Boolean(definition?.menu)}
        open={openMenu === item.id}
        onMenuChange={setOpenMenu}
        onCloseMenu={closeMenu}
        onAction={pressAction}
        onRemove={confirmRemove}
      />
    );
  }

  if (query.isPending || query.isError || !definition) {
    return (
      <Shell title={definition?.title ?? ''}>
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
      </Shell>
    );
  }

  const body = (
    <>
      {/* Menu ouvert : un toucher ailleurs que sur un bouton ou une carte (entre les cartes, l'intitulé, le vide) le
          referme (décision 2026-11-24-menu-se-ferme-au-toucher). */}
      <View
        style={styles.fill}
        testID="profile-list-area"
        onStartShouldSetResponder={() => openMenu !== null || headerMenuOpen}
        onResponderRelease={() => {
          setOpenMenu(null);
          setHeaderMenuOpen(false);
        }}>
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
        empty={activeFilterCount(definition.filters ?? [], filters.values) > 0 ? t('list.noFilterResults') : search ? t('list.noResults') : definition.empty}
        search={definition.search ? { value: searchText, onChange: setSearchText, placeholder: definition.search, onFocus: () => setOpenMenu(null) } : null}
        filter={
          // Pas de lien « Filtres » quand tous sont cachés (l'offre des avis, décision 2026-11-25-liste-avis-generique).
          definition.filters && definition.filters.some((field) => !isFixedFilter(field))
            ? {
                label: t('list.filters'),
                count: activeFilterCount(definition.filters, filters.values),
                // Dans le panneau qui monte du bas, comme partout (décision 2026-11-25-filtres-en-panneau).
                onPress: () => setFiltersOpen(true),
              }
            : null
        }
        // Sous les filtres, en tête des items : l'intitulé servi, son titre en gras et dessous son sous-titre (le
        // logement des « Demandes » et sa ligne du type, décisions 2026-11-21-demandes-titre-sous-filtres et
        // 2026-11-21-demandes-d-une-offre).
        header={
          definition.heading ? (
            <View style={styles.heading} testID="profile-list-heading">
              {definition.heading.title && (
                <ThemedText type={headingType} style={styles.centered} testID="profile-list-heading-title">
                  {definition.heading.title}
                </ThemedText>
              )}
              {definition.heading.subtitle && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.centered} testID="profile-list-heading-subtitle">
                  {definition.heading.subtitle}
                </ThemedText>
              )}
            </View>
          ) : null
        }
        onScrollBeginDrag={() => {
          setOpenMenu(null);
          setHeaderMenuOpen(false);
        }}
        // Deux cartes par ligne quand l'API le demande (« Récemment consultés », décision 2026-11-27-listes-de-favoris).
        columns={definition.columns ?? 1}
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
      />
      </View>
      {/* Le bouton fixe en bas : un formulaire (« Ajouter un logement ») ou un écran (« Rechercher un logement »). */}
      {definition.footer && (
        <FixedButtonBar label={definition.footer.label} onPress={() => definition.footer && openListFooter(definition.footer)} testID="profile-list-footer" />
      )}
      <FilterSheet list={list} visible={filtersOpen} onClose={() => setFiltersOpen(false)} />
      {/* Le panneau d'une action (« Statistiques »), à taille maximale, titré de son libellé. */}
      <BottomSheet visible={panel !== null} title={panel?.label ?? ''} onClose={() => setPanel(null)} testID="profile-list-panel">
        {panel?.panel && <ActionPanel name={panel.panel.name} record={panel.panel.record} />}
      </BottomSheet>
    </>
  );

  // Avec un menu du haut : le même cadre, le menu ⋮ à droite de la barre (le retour reste à gauche).
  return headerMenu ? (
    <MenuShell title={definition.title} right={headerMenu}>
      {body}
    </MenuShell>
  ) : (
    <Shell title={definition.title} scrolls={false}>
      {body}
    </Shell>
  );
}

export { SEARCH_DELAY };

/**
 * Le cadre d'une liste dont la barre du haut porte un menu ⋮ à droite (une liste de favoris ouverte, décision
 * 2026-11-27-listes-de-favoris) : celui de `ProfileScreenShell` (sans défilement), avec `right` dans la barre.
 */
function MenuShell({ title, right, children }: PropsWithChildren<{ title: string; right: ReactNode }>) {
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={title} right={right} />
          <View style={styles.fill}>{children}</View>
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

/** La liste sans cadre de page : dans un panneau, qui a déjà son titre et sa croix. */
function BareShell({ children }: PropsWithChildren<{ title: string; scrolls?: boolean }>) {
  return <View style={styles.fill}>{children}</View>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  error: { color: ERROR_COLOR },
  // Centré, comme partout : le nombre d'éléments trouvés (décision 2026-11-25-nombre-centre).
  heading: { gap: Spacing.half, alignItems: 'center' },
  centered: { textAlign: 'center' },
  fill: { flex: 1 },
});
