import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Avatar } from '@/features/auth/components/Avatar';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { List } from '@/shared/components/List';
import { StatusTag, TONE_COLORS } from '@/shared/components/StatusTag';
import { showToast } from '@/shared/components/Toast';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ERROR_COLOR } from '@/shared/theme/colors';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { ContactRow } from './ContactRow';
import { PartnerLoader } from './PartnerLoader';
import { partnerService } from '../services/PartnerService';
import type { PartnerMember } from '../types';

const AVATAR_SIZE = 40;
const MEMBER_PHOTO_SIZE = 96;
/** La bordure de la photo d'un membre, et son vert « en ligne » (celui des pastilles « succès »). */
const PHOTO_BORDER = 2;
const ONLINE_COLOR = TONE_COLORS.success;

/**
 * Les membres d'un partenaire, lus avec lui (décisions 2026-11-27-partenaire-membres,
 * 2026-11-27-partenaire-membre-panneau et 2026-11-27-membres-recherche) : la recherche (nom, e-mail, téléphone), le
 * nombre de ses comptes (« 3 membres »), puis chacun, sa photo, son nom et
 * la pastille verte « Administrateur » (la photo bordée de vert s'il est en ligne), les administrateurs d'abord (l'ordre servi). Toucher un membre ouvre son
 * panneau, à la hauteur de son contenu : sa photo, son nom, son téléphone et son e-mail. Le panneau « Membres » d'une
 * notification de partenaire.
 */
export function PartnerMembers({ id }: { id: string }) {
  const { t } = useI18n();
  // Le membre ouvert, par son identifiant : relu, son panneau suit un changement (« Administrateur »).
  const [openId, setOpenId] = useState<string | null>(null);
  // La recherche, dans l'app : tous ses comptes sont déjà là (décision 2026-11-27-membres-recherche).
  const [search, setSearch] = useState('');

  return (
    <PartnerLoader id={id}>
      {(partner) => (
        <>
          <List
            items={matching(partner.members ?? [], search)}
            keyExtractor={(member) => member.id}
            renderItem={(member) => <MemberRow member={member} onPress={() => setOpenId(member.id)} />}
            search={{ value: search, onChange: setSearch, placeholder: t('partners.members_search') }}
            header={
              partner.members_label ? (
                <ThemedText type="smallBold" testID="partner-members-count">
                  {partner.members_label}
                </ThemedText>
              ) : null
            }
            empty={search.trim() !== '' ? t('partners.members_none') : null}
            contentContainerStyle={styles.body}
            testID="partner-members"
          />
          {/* Dans la fenêtre du panneau « Membres » : il s'ouvre par-dessus. */}
          <MemberSheet partnerId={partner.id} member={(partner.members ?? []).find((member) => member.id === openId) ?? null} onClose={() => setOpenId(null)} />
        </>
      )}
    </PartnerLoader>
  );
}

/** Sans accents ni majuscules : « Zoé » se trouve en tapant « zoe ». */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Les membres dont le nom, l'e-mail ou le téléphone contient la saisie ; tous sans saisie. */
function matching(members: PartnerMember[], search: string): PartnerMember[] {
  const term = fold(search.trim());
  if (term === '') {
    return members;
  }

  return members.filter((member) => [member.name, member.email, member.phone].some((value) => value !== null && fold(value).includes(term)));
}

function MemberRow({ member, onPress }: { member: PartnerMember; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.backgroundSelected }, pressed && styles.pressed]}
      testID={`partner-member-${member.id}`}>
      <MemberPhoto member={member} size={AVATAR_SIZE} testID={`partner-member-${member.id}-photo`} />
      <ThemedText style={styles.name} numberOfLines={1} testID={`partner-member-${member.id}-name`}>
        {member.name}
      </ThemedText>
      {member.tag && <StatusTag tag={member.tag} testID={`partner-member-${member.id}-tag`} />}
    </Pressable>
  );
}

/**
 * La photo d'un membre (ou ses initiales), bordée : verte s'il est en ligne, discrète sinon (décision
 * 2026-11-27-membres-photo-en-ligne). La liste et son panneau.
 */
function MemberPhoto({ member, size, testID }: { member: PartnerMember; size: number; testID: string }) {
  const theme = useTheme();
  const outer = size + PHOTO_BORDER * 2;

  return (
    <View
      style={[styles.photo, { width: outer, height: outer, borderRadius: outer / 2, borderColor: member.online ? ONLINE_COLOR : theme.backgroundSelected }]}
      testID={testID}>
      <Avatar user={{ initials: member.initials, avatar_url: member.photo }} size={size} />
    </View>
  );
}

/** Le panneau d'un membre, à la hauteur de son contenu, par-dessus la liste. */
function MemberSheet({ partnerId, member, onClose }: { partnerId: string; member: PartnerMember | null; onClose: () => void }) {
  return (
    <BottomSheet visible={member !== null} title={member?.name ?? ''} fitContent onClose={onClose} testID="partner-member-sheet">
      {member && <MemberCard partnerId={partnerId} member={member} onRemoved={onClose} />}
    </BottomSheet>
  );
}

/**
 * Un membre : sa photo et son nom, sans pastille (décision 2026-11-27-membre-panneau-sans-pastille) ; puis son téléphone
 * et son e-mail, qui ouvrent l'appel et l'e-mail ; pour un administrateur qui regarde un autre compte, l'interrupteur
 * « Administrateur » et « Retirer du groupe ».
 */
function MemberCard({ partnerId, member, onRemoved }: { partnerId: string; member: PartnerMember; onRemoved: () => void }) {
  const { t } = useI18n();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // « Administrateur » : envoyé, le partenaire est relu (la pastille, l'ordre) ; refusé, le message du serveur.
  async function toggleAdmin(isAdmin: boolean) {
    setSaving(true);
    try {
      await partnerService.setAdmin(partnerId, member.id, isAdmin);
      await queryClient.invalidateQueries({ queryKey: ['partner', partnerId] });
    } catch (error) {
      showToast(error instanceof Error && error.message ? error.message : t('error.unknown'), 'danger');
    } finally {
      setSaving(false);
    }
  }

  // « Retirer du groupe », après confirmation : le panneau se ferme, le partenaire est relu ; refusé, le message du serveur
  // (décision 2026-11-27-membre-retirer).
  function confirmRemove() {
    Alert.alert(t('partners.member_remove_confirm'), undefined, [
      { text: t('list.cancel'), style: 'cancel' },
      { text: t('partners.member_remove'), style: 'destructive', onPress: () => void remove() },
    ]);
  }

  async function remove() {
    setSaving(true);
    try {
      await partnerService.removeMember(partnerId, member.id);
      onRemoved();
      showToast(t('partners.member_removed'));
      await queryClient.invalidateQueries({ queryKey: ['partner', partnerId] });
    } catch (error) {
      showToast(error instanceof Error && error.message ? error.message : t('error.unknown'), 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card} testID="partner-member-card">
      <View style={styles.identity}>
        <MemberPhoto member={member} size={MEMBER_PHOTO_SIZE} testID="partner-member-card-photo" />
        <ThemedText type="subtitle" style={styles.centered} testID="partner-member-card-name">
          {member.name}
        </ThemedText>
      </View>
      {/* Affichés masqués ; le lien appelle ou écrit au vrai numéro, à la vraie adresse (décision
          2026-11-27-email-telephone-masques). */}
      {member.phone && <ContactRow label={t('partners.phone')} value={member.phone_masked ?? member.phone} url={`tel:${member.phone.replace(/\s/g, '')}`} testID="partner-member-card-phone" />}
      {member.email && <ContactRow label={t('partners.email')} value={member.email_masked ?? member.email} url={`mailto:${member.email}`} testID="partner-member-card-email" />}
      {/* Faire ou défaire un administrateur : pour un administrateur, sur un autre compte que le sien (décision
          2026-11-27-membre-administrateur). */}
      {member.can_change_admin && (
        <View style={styles.switchRow}>
          <ThemedText style={styles.switchLabel}>{t('partners.admin')}</ThemedText>
          <Switch
            testID="partner-member-card-admin"
            accessibilityLabel={t('partners.admin')}
            value={member.is_admin}
            onValueChange={(value) => void toggleAdmin(value)}
            disabled={saving}
            trackColor={{ false: theme.backgroundSelected, true: theme.text }}
            thumbColor={theme.background}
            ios_backgroundColor={theme.backgroundSelected}
          />
        </View>
      )}
      {/* Retirer ce compte du partenaire : pour un administrateur, sur un autre compte que le sien. En rouge, comme toute
          action qui retire. */}
      {member.can_remove && (
        <Pressable
          accessibilityRole="button"
          onPress={confirmRemove}
          disabled={saving}
          hitSlop={Spacing.two}
          style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          testID="partner-member-card-remove">
          <ThemedText style={styles.danger}>{t('partners.member_remove')}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: 1 },
  name: { flex: 1 },
  pressed: { opacity: 0.6 },
  photo: { borderWidth: PHOTO_BORDER, alignItems: 'center', justifyContent: 'center' },
  card: { padding: Spacing.four, gap: Spacing.three },
  identity: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  centered: { textAlign: 'center' },
  // L'interrupteur, comme un champ oui / non : le libellé à gauche, sélection noire (décision 2026-11-26-selection-noir-et-blanc).
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  switchLabel: { flex: 1 },
  remove: { alignSelf: 'center', paddingVertical: Spacing.two },
  danger: { color: ERROR_COLOR },
});
