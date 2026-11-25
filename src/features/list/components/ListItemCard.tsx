import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { profileSubmission } from '@/features/auth/services/ProfileFormService';
import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { CARD_BODY, CARD_GAP, CARD_PADDING } from '@/shared/components/List';
import { Stars } from '@/shared/components/Stars';
import { StatusTag, TONE_COLORS } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';
import { ViewsCount } from '@/shared/components/ViewsCount';

import { ITEM_LINK } from '../services/ListService';
import type { ListItem, ListItemAction } from '../types';
import { ItemActionButtons } from './ItemActionButtons';
import { ItemPicture } from './ItemPicture';
import { ItemReviews } from './ItemReviews';

/** Le côté d'une image à gauche du texte, en points : celui d'un logo de la page « Partenaires ». */
const SIDE_IMAGE = 72;

type Props = {
  item: ListItem;
  /** Toutes les actions dans un menu « ⋮ » (« Mes logements », décision 2026-11-21-actions-en-menu). */
  menu?: boolean;
  /** Le menu de cette carte est ouvert. */
  open?: boolean;
  /** Ouvre (l'identifiant de la carte) ou ferme (`null`) le menu. */
  onMenuChange?: (id: string | null) => void;
  /** Ferme un menu ouvert ailleurs : vrai s'il y en avait un (le toucher ne fait alors rien d'autre). */
  onCloseMenu?: () => boolean;
  /** Un bouton de la carte (« Accepter », « Refuser »…). */
  onAction: (action: ListItemAction) => void;
  /** « Retirer », après confirmation. */
  onRemove?: (item: ListItem) => void;
  /** Chaque bouton de la carte sur toute la ligne (le panneau du jour du calendrier). */
  fullWidthActions?: boolean;
  /** Le préfixe des identifiants de test. */
  testID?: string;
};

/**
 * La carte d'un item de liste, décrite par l'API, la même partout (décision 2026-11-22-carte-liste-partagee) : les
 * listes du profil (« Mes logements », « Mes réservations », les demandes reçues…) et le panneau du jour du
 * calendrier d'un logement. Photo, statut, titre, texte, message, date, note, compteurs, boutons, menu, retrait :
 * chacun seulement s'il est servi.
 */
export function ListItemCard({ item, menu = false, open = false, onMenuChange, onCloseMenu, onAction, onRemove, fullWidthActions = false, testID: prefix = 'profile-list' }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const close = () => onCloseMenu?.() ?? false;

  const edit = item.edit;
  // L'écran de l'app que l'item désigne (« /offers/12 », décision 2026-11-19-contrat-vedette-favoris).
  const link = item.link && ITEM_LINK.test(item.link) ? item.link : null;
  const removable = item.delete !== null && profileSubmission(item.delete) !== null;
  // Le statut sur la photo quand l'API le demande ; avec un cœur, en haut à gauche (décision 2026-11-21-reservations-statut-coeur).
  // L'image en petit à gauche du texte, comme la page « Partenaires » (décision 2026-11-24-mes-partenaires-comme-partenaires).
  // Sans image, sa place reste réservée, vide : les textes restent alignés (décision 2026-11-24-mes-partenaires-comme-partenaires).
  const side = item.image_layout === 'side';
  const tagOnImage = Boolean(item.tag?.on_image && item.image && !side);
  const counters = item.counters?.length ? item.counters : item.counter ? [item.counter] : [];
  // Le titre en lien vers son propre écran (le membre d'une demande), le reste de la carte gardant le sien
  // (décision 2026-11-21-demandes-lien-membre).
  const titleLink = item.title_link && ITEM_LINK.test(item.title_link) ? item.title_link : null;
  // En gras, à la taille de l'accueil ; en lien, dans la couleur des liens (décision 2026-11-22-cartes-titre-gras).
  // La date de la dernière notification (décision 2026-11-22-demandes-date-derniere-notification).
  // Dite en temps relatif par le serveur (décision 2026-11-25-dates-formatees-serveur).
  const dateText = item.date_text ?? null;
  // Le sous-titre en lien (le titre saisi d'une offre dans « Mes réservations », décision 2026-11-22-reservations-lien-offre).
  const subtitleLink = item.subtitle_link && ITEM_LINK.test(item.subtitle_link) ? item.subtitle_link : null;
  const itemSubtitle = !item.subtitle ? null : subtitleLink ? (
    <ThemedText
      type="small"
      accessibilityRole="link"
      onPress={() => close() || router.push(subtitleLink as Href)}
      style={[styles.subtitleLink, { color: theme.primary }]}
      testID={`${prefix}-subtitle-link-${item.id}`}>
      {item.subtitle}
    </ThemedText>
  ) : (
    // Coupé à `subtitle_lines` lignes quand l'API le demande (décision 2026-11-24-mes-partenaires-cartes).
    <ThemedText type="small" themeColor="textSecondary" numberOfLines={item.subtitle_lines ?? undefined} testID={`${prefix}-subtitle-${item.id}`}>
      {item.subtitle}
    </ThemedText>
  );
  const itemTitle = titleLink ? (
    <ThemedText
      type="smallBold"
      accessibilityRole="link"
      onPress={() => close() || router.push(titleLink as Href)}
      // Le lien sur le texte seul, pas sur toute la ligne (décision 2026-11-22-liens-sur-le-texte).
      style={[styles.subtitleLink, { color: theme.primary }]}
      testID={`${prefix}-title-link-${item.id}`}>
      {item.title}
    </ThemedText>
  ) : (
    <ThemedText type="smallBold" testID={`${prefix}-title-${item.id}`}>
      {item.title}
    </ThemedText>
  );
  // Un avis, disposé comme sur la fiche : le prénom, « ★★★★☆ · 18 nov. 2026 », le commentaire (décision
  // 2026-11-25-liste-avis-generique).
  const reviewBody =
    item.layout !== 'review' ? null : (
            <View style={styles.body} testID={`${prefix}-body-${item.id}`}>
              {itemTitle}
              <View style={styles.reviewMeta}>
                {item.rating && (
                  <View
                    accessible
                    accessibilityLabel={t('form.ratingValue', { value: String(item.rating.average) })}
                    testID={`${prefix}-item-${item.id}-rating`}>
                    <Stars value={item.rating.average} emptyColor={`${theme.textSecondary}66`} />
                  </View>
                )}
                {/* La date formatée par le serveur, la même que sur la fiche (décision 2026-11-25-dates-formatees-serveur). */}
                {item.detail && (
                  <ThemedText type="small" themeColor="textSecondary" testID={`${prefix}-detail-${item.id}`}>
                    {item.rating ? `· ${item.detail}` : item.detail}
                  </ThemedText>
                )}
              </View>
              {item.subtitle && (
                <ThemedText type="small" testID={`${prefix}-subtitle-${item.id}`}>
                  {item.subtitle}
                </ThemedText>
              )}
            </View>
    );
  // Le message cité et, à sa droite, le nombre de notifications non lues en pastille (décision
  // 2026-11-22-demandes-pastille-nombre-message).
  const unreadCount = item.unread_count ?? 0;
  const messageRow =
    item.quote || unreadCount > 0 ? (
      <View style={styles.messageRow}>
        <View style={styles.messageText}>
          {/* Le message, simplement en italique et en gris, sur une ligne (décisions 2026-11-22-demandes-message-italique et 2026-11-22-demandes-message-gris). */}
          {item.quote && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} ellipsizeMode="tail" style={styles.message} testID={`${prefix}-quote-${item.id}`}>
              {item.quote}
            </ThemedText>
          )}
        </View>
        {unreadCount > 0 && (
          <View accessible accessibilityLabel={t('notifications.unreadCount', { count: unreadCount })} testID={`${prefix}-unread-${item.id}`}>
            {/* Vert franc, chiffre en blanc (décision 2026-11-22-demandes-pastille-vert-franc). */}
            <View style={[styles.unreadPill, { backgroundColor: TONE_COLORS.success }]}>
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                {unreadCount}
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    ) : null;
  const titleRow = itemTitle;
  // La date de la dernière notification, après le message, alignée à droite (décision 2026-11-22-demandes-date-apres-message).
  const dateRow = dateText ? (
    <ThemedText type="small" themeColor="textSecondary" style={styles.dateRow} testID={`${prefix}-date-${item.id}`}>
      {dateText}
    </ThemedText>
  ) : null;
  // Un compteur avec un ton : une pastille de cette couleur, pour information, sans lien (« 2 demandes en
  // attente », orange) : sur la photo, à la place du statut, qui revient quand il n’y en a plus ; sans photo, à côté
  // du statut. Les autres compteurs restent des liens, en bas de la carte (décisions
  // 2026-11-21-pastille-sur-la-photo et 2026-11-21-pastille-sans-lien).
  const tonedCounter = counters.find((counter) => counter.tone) ?? null;
  const tonedTag = tonedCounter ? { label: tonedCounter.label, tone: tonedCounter.tone ?? 'neutral' } : null;
  const pictureTag = tonedTag && item.image ? tonedTag : tagOnImage ? item.tag : null;
  // Sans photo : le statut et la pastille d'un compteur sur une ligne, au-dessus du titre (décision
  // 2026-11-21-demandes-pastille-non-lues-total).
  const plainTag = item.tag && !tagOnImage ? item.tag : null;
  const badge = tonedTag && (!item.image || side) ? tonedTag : null;
  const tagsRow = (plainTag || badge) && (
    <View style={[styles.tags, side && styles.sideTags]} testID={`${prefix}-tags-${item.id}`}>
      {plainTag && <StatusTag tag={plainTag} testID={`${prefix}-tag-${item.id}`} />}
      {badge && <StatusTag tag={badge} testID={`${prefix}-badge-${item.id}`} />}
    </View>
  );
  const plainCounters = counters.filter((counter) => !counter.tone);
  // Un formulaire et un écran : « Voir » et « Éditer » (décision 2026-11-19-nuit-voir-editer-retirer).
  const both = Boolean(edit && link);
  // Toutes les actions dans un menu déroulant « Actions », quand la liste le demande (« Mes logements »,
  // décision 2026-11-21-actions-en-menu).
  // (menu : servi par la liste, `menu`.)
  const menuOpen = menu && open;
  // Sans photo ni menu : « Retirer » en icône corbeille, à droite du texte (décision 2026-11-21-corbeille-a-droite).
  const removeIcon = removable && !item.image && !side && !menu;
  // Avec une photo, « Voir » et « Éditer », ou « Retirer » en texte : en colonne, les actions sur leur ligne,
  // à la fin, à droite (décisions 2026-11-19-nuit-retirer-sous-image et 2026-11-21-retirer-en-fin-de-carte).
  // Des boutons pleine largeur (le calendrier) : sous la date, ligne par ligne (décision 2026-11-22-calendrier-boutons-sous-la-date).
  const stacked = (Boolean(item.image) && !side) || both || (removable && !removeIcon) || (fullWidthActions && (item.actions?.length ?? 0) > 0);

  function openEdit() {
    if (edit) {
      router.push({ pathname: '/profile/[form]', params: { form: edit.form, record: edit.record } });
    }
  }

  // Avec un menu, la carte ouvre son écran, « Éditer » restant dans le menu (décision 2026-11-22-logements-carte-vers-fiche) ;
  // sinon, le formulaire s'il y en a un.
  function openLink() {
    if (link) {
      router.push(link as Href);
    }
  }

  const removeButton = removable && item.delete && (
    <Pressable
      testID={`${prefix}-delete-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.delete.label} ${item.title}`}
      hitSlop={Spacing.one}
      onPress={() => onRemove?.(item)}
      style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
      {removeIcon ? (
        <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} tintColor={ERROR_COLOR} />
      ) : (
        <ThemedText type="small" style={styles.error}>
          {item.delete.label}
        </ThemedText>
      )}
    </Pressable>
  );

  // Les entrées du menu « Actions » : Éditer, les boutons de la carte, Retirer (en rouge). Plus de « Voir » : avec
  // un menu, toucher la carte ouvre son écran (décision 2026-11-22-logements-carte-vers-fiche).
  const menuEntries = menu
    ? [
        ...(edit ? [{ key: 'edit', label: t('list.edit'), danger: false, onPress: openEdit }] : []),
        ...(item.actions ?? []).map((action, index) => ({ key: `action-${index}`, label: action.label, danger: action.style === 'destructive', onPress: () => onAction(action) })),
        ...(removable && item.delete ? [{ key: 'delete', label: item.delete.label, danger: true, onPress: () => onRemove?.(item) }] : []),
      ]
    : [];

  return (
    <View
      style={[styles.row, stacked && styles.stacked, item.layout === 'review' && styles.reviewRow, { borderColor: theme.backgroundSelected }]}
      testID={`${prefix}-row-${item.id}`}>
      {removeIcon ? (
        // Le texte, et la corbeille à sa droite (décision 2026-11-21-corbeille-a-droite).
        <View style={styles.head}>
          <Pressable
            testID={`${prefix}-item-${item.id}`}
            accessibilityRole={edit || link ? 'link' : undefined}
            disabled={!edit && !link}
            onPress={() => close() || (edit && !(menu && link) ? openEdit() : openLink())}
            style={({ pressed }) => [styles.itemText, pressed && styles.pressed]}>
            {/* La photo de l'item, s'il en a une, au-dessus du titre ; son cœur de favori. */}
            {/* La photo ; la pastille du statut dessus, à la place du cœur, quand l'API le demande et qu'il y a
                une photo (décision 2026-11-21-statut-a-la-place-du-coeur), sinon sous la photo ; à sa place, la pastille
                des demandes en attente, sans lien (décisions 2026-11-21-pastille-sur-la-photo et 2026-11-21-pastille-sans-lien). */}
            <ItemPicture item={item} tag={pictureTag} tagLeft={menu} testID={`${prefix}-item-${item.id}`} />
            {/* Sous la photo, une zone en retrait (décision 2026-11-22-cartes-espace-sous-photo). */}
            {reviewBody ?? (
            <View style={item.image ? CARD_BODY : styles.body} testID={`${prefix}-body-${item.id}`}>
              {tagsRow}
              {titleRow}
              {itemSubtitle}
              {/* Sur sa ligne, sous le sous-titre, en gris comme lui : le type de demande et les dates (décision 2026-11-22-reservations-ligne-dates). */}
              {item.detail && (
                <ThemedText type="small" themeColor="textSecondary" testID={`${prefix}-detail-${item.id}`}>
                  {item.detail}
                </ThemedText>
              )}
              {/* Ses vues : un œil suivi du nombre (décision 2026-11-25-vues-oeil). */}
              {item.views && <ViewsCount views={item.views} testID={`${prefix}-views-${item.id}`} />}
              {/* Le message, après le texte (décision 2026-11-22-demandes-message-apres-texte). */}
              {messageRow}
              {dateRow}
              {/* La note et la phrase mise en avant, quand l'API les sert. */}
              <ItemReviews item={item} testID={`${prefix}-item-${item.id}`} />
            </View>
            )}
          </Pressable>
          {removeButton}
        </View>
      ) : (
        <Pressable
          testID={`${prefix}-item-${item.id}`}
          accessibilityRole={edit || link ? 'link' : undefined}
          disabled={!edit && !link}
          onPress={() => close() || (edit && !(menu && link) ? openEdit() : openLink())}
          style={({ pressed }) => [styles.itemText, side && styles.sideRow, menu && !item.image && !side && styles.besideMenu, pressed && styles.pressed]}>
          {/* La photo de l'item, s'il en a une, au-dessus du titre ; son cœur de favori. */}
          {/* La photo ; la pastille du statut dessus, à la place du cœur, quand l'API le demande et qu'il y a
              une photo (décision 2026-11-21-statut-a-la-place-du-coeur), sinon sous la photo ; à sa place, la pastille
                des demandes en attente, sans lien (décisions 2026-11-21-pastille-sur-la-photo et 2026-11-21-pastille-sans-lien). */}
          {side && !item.image ? (
            <View style={styles.sideImage} testID={`${prefix}-item-${item.id}-side-empty`} />
          ) : side ? (
            // En petit, en entier, à gauche, coins arrondis, comme la page « Partenaires ».
            <Image
              source={{ uri: item.image as string }}
              style={styles.sideImage}
              contentFit={item.image_fit === 'contain' ? 'contain' : 'cover'}
              accessibilityIgnoresInvertColors
              testID={`${prefix}-item-${item.id}-side-photo`}
            />
          ) : (
            <ItemPicture item={item} tag={pictureTag} tagLeft={menu} testID={`${prefix}-item-${item.id}`} />
          )}
          {/* Sous la photo, une zone en retrait (décision 2026-11-22-cartes-espace-sous-photo) ; à côté d'une image à gauche, le reste de la ligne. */}
          {reviewBody ?? (
          <View style={side ? styles.sideBody : item.image ? CARD_BODY : styles.body} testID={`${prefix}-body-${item.id}`}>
            {tagsRow}
            {titleRow}
            {itemSubtitle}
            {/* Sur sa ligne, sous le sous-titre, en gris comme lui : le type de demande et les dates (décision 2026-11-22-reservations-ligne-dates). */}
            {item.detail && (
              <ThemedText type="small" themeColor="textSecondary" testID={`${prefix}-detail-${item.id}`}>
                {item.detail}
              </ThemedText>
            )}
            {/* Ses vues : un œil suivi du nombre (décision 2026-11-25-vues-oeil). */}
            {item.views && <ViewsCount views={item.views} compact testID={`${prefix}-views-${item.id}`} />}
            {/* Le message, après le texte (décision 2026-11-22-demandes-message-apres-texte). */}
            {messageRow}
            {dateRow}
            {/* La note et la phrase mise en avant, quand l'API les sert. */}
            <ItemReviews item={item} testID={`${prefix}-item-${item.id}`} />
          </View>
          )}
        </Pressable>
      )}
      {/* Ses autres compteurs (« 1 notification non lue », décision 2026-11-21-compteur-non-lues), pour information :
          sans lien, à droite, sur un vert doux (décision 2026-11-22-compteurs-non-lus-info). */}
      {plainCounters.length > 0 && (
        <View style={styles.counters} testID={`${prefix}-counters-${item.id}`}>
          {plainCounters.map((counter, index) => (
            <View
              key={counter.label}
              testID={index === 0 ? `${prefix}-counter-${item.id}` : `${prefix}-counter-${item.id}-${index}`}
              style={[styles.counter, { backgroundColor: SOFT_GREEN }]}>
              <ThemedText type="smallBold" style={{ color: SOFT_GREEN_TEXT }}>
                {counter.label}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
      {menu ? (
        menuEntries.length > 0 && (
          // Un seul bouton, trois petits points verticaux, flottant en haut à droite de la photo sur une pastille
          // ronde ; ouvert, ses entrées flottent dessous, par-dessus la photo (décisions 2026-11-21-actions-en-menu
          // et 2026-11-21-menu-en-haut-a-droite).
          <View style={[styles.menu, side && styles.sideMenu]} testID={`${prefix}-menu-${item.id}`}>
            <Pressable
              testID={`${prefix}-menu-${item.id}-toggle`}
              accessibilityRole="button"
              accessibilityState={{ expanded: menuOpen }}
              accessibilityLabel={`${t('list.actions')} ${item.title}`}
              hitSlop={Spacing.one}
              onPress={() => onMenuChange?.(menuOpen ? null : item.id)}
              style={({ pressed }) => [styles.menuToggle, { backgroundColor: theme.background, shadowColor: theme.text }, pressed && styles.pressed]}>
              {/* Trois petits points verticaux, sans texte (décisions 2026-11-21-menu-trois-points et
                  2026-11-21-menu-flottant). */}
              <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={20} tintColor={theme.text} style={styles.vertical} />
            </Pressable>
            {menuOpen && (
              <View style={[styles.menuList, { borderColor: theme.backgroundSelected, backgroundColor: theme.background, shadowColor: theme.text }]} testID={`${prefix}-menu-${item.id}-list`}>
                {menuEntries.map((entry) => (
                  <Pressable
                    key={entry.key}
                    testID={`${prefix}-menu-${item.id}-${entry.key}`}
                    accessibilityRole="button"
                    onPress={() => {
                      onMenuChange?.(null);
                      entry.onPress();
                    }}
                    style={({ pressed }) => [styles.menuEntry, pressed && { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="small" style={entry.danger ? styles.error : undefined}>
                      {entry.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )
      ) : (
        <>
          <ItemActionButtons actions={item.actions ?? []} testID={`${prefix}-action-${item.id}`} onPress={onAction} fullWidth={fullWidthActions} />
          {stacked ? (
            <View style={styles.actions} testID={`${prefix}-actions-${item.id}`}>
              {both && (
                <Pressable
                  testID={`${prefix}-view-${item.id}`}
                  accessibilityRole="link"
                  accessibilityLabel={`${t('list.view')} ${item.title}`}
                  hitSlop={Spacing.one}
                  onPress={openLink}
                  style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
                  <ThemedText type="linkPrimary">{t('list.view')}</ThemedText>
                </Pressable>
              )}
              {/* « Éditer » avec « Voir » seulement : sans écran, toucher la carte ouvre le formulaire
                  (décision 2026-11-21-sans-editer-adresses). */}
              {both && (
                <Pressable
                  testID={`${prefix}-edit-${item.id}`}
                  accessibilityRole="link"
                  accessibilityLabel={`${t('list.edit')} ${item.title}`}
                  hitSlop={Spacing.one}
                  onPress={openEdit}
                  style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
                  <ThemedText type="linkPrimary">{t('list.edit')}</ThemedText>
                </Pressable>
              )}
              {!removeIcon && removeButton}
            </View>
          ) : (
            !removeIcon && removeButton
          )}
        </>
      )}
    </View>
  );
}

/** Le vert doux des compteurs d'information, et son texte (décision 2026-11-22-compteurs-non-lus-info). */
const SOFT_GREEN = '#E3F4EA';
const SOFT_GREEN_TEXT = '#2E7D4F';

const styles = StyleSheet.create({
  error: { color: ERROR_COLOR },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  // Sans fond, une bordure (décision 2026-11-18-liste-bordure) ; les espacements de la carte de l'accueil : 8 de
  // marge intérieure, 4 entre les lignes (décision 2026-11-22-cartes-espacements-accueil).
  row: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: CARD_GAP,
    padding: CARD_PADDING,
    borderRadius: 8,
  },
  // Un item avec photo : en colonne.
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  // Un avis : une ligne au-dessus seulement, sans cadre ni marge intérieure ; un peu d'air sous la ligne (décision
  // 2026-11-25-liste-avis-generique).
  reviewRow: { borderWidth: 0, borderTopWidth: 1, borderRadius: 0, padding: 0, paddingTop: Spacing.three },
  itemText: { flex: 1, gap: CARD_GAP },
  // Sans photo, le texte sans retrait.
  body: { gap: CARD_GAP },
  // Sans photo, avec le menu : le texte s'arrête avant le bouton rond (décision 2026-11-21-demandes-sans-photo).
  besideMenu: { paddingRight: 32 + Spacing.two },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  sideImage: { width: SIDE_IMAGE, height: SIDE_IMAGE, borderRadius: 8 },
  // Plus d'air entre le statut, le titre et la ligne dessous (décision 2026-11-24-mes-partenaires-comme-partenaires).
  sideBody: { flex: 1, gap: Spacing.two },
  delete: { padding: Spacing.one },
  // Le texte et la corbeille à sa droite.
  head: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // Le menu des actions, flottant en haut à droite de la photo (marge de la carte + du texte, puis un retrait) ;
  // ses entrées dessous, par-dessus la photo.
  menu: { position: 'absolute', top: CARD_PADDING + Spacing.two, right: CARD_PADDING + Spacing.two, alignItems: 'flex-end', zIndex: 2 },
  // Une pastille ronde, pour rester lisible sur n'importe quelle photo.
  menuToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  // Trois points verticaux : l'icône « ellipsis » d'iOS, tournée d'un quart de tour.
  vertical: { transform: [{ rotate: '90deg' }] },
  menuList: {
    position: 'absolute',
    right: 0,
    top: 40,
    minWidth: 180,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  menuEntry: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  // La ligne des actions, sous le contenu, à droite.
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.three },
  pressed: { opacity: 0.6 },
  counters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: Spacing.two },
  heading: { gap: Spacing.half },
  subtitleLink: { alignSelf: 'flex-start' },
  // Le titre et, à droite, la date.
  // Le message et, à droite, la pastille des non lues.
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dateRow: { textAlign: 'right' },
  messageText: { flex: 1 },
  message: { fontStyle: 'italic' },
  unreadPill: { minWidth: 24, alignItems: 'center', paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // Plus d'air entre le statut et le titre, à côté d'une image à gauche (décision 2026-11-24-mes-partenaires-comme-partenaires).
  sideTags: { marginBottom: Spacing.one },
  // Sans photo dessous à suivre : à la marge de la carte, près du coin (décision 2026-11-24-mes-partenaires-comme-partenaires).
  sideMenu: { top: CARD_PADDING, right: CARD_PADDING },
  counter: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 12 },
});
