import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/features/auth/components/Avatar';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { StatusTag } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { ContactRow, PartnerLoader } from './PartnerDetails';
import type { PartnerMember } from '../types';

const AVATAR_SIZE = 40;
const MEMBER_PHOTO_SIZE = 96;

/**
 * Les membres d'un partenaire, lus avec lui (décisions 2026-11-27-partenaire-membres et
 * 2026-11-27-partenaire-membre-panneau) : le nombre de ses comptes (« 3 membres »), puis chacun, sa photo, son nom et
 * la pastille verte « Administrateur », les administrateurs d'abord (l'ordre servi). Toucher un membre ouvre son
 * panneau, à la hauteur de son contenu : sa photo, son nom, son téléphone et son e-mail. Le panneau « Membres » d'une
 * notification de partenaire.
 */
export function PartnerMembers({ id }: { id: string }) {
  const [open, setOpen] = useState<PartnerMember | null>(null);

  return (
    <PartnerLoader id={id}>
      {(partner) => (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            {partner.members_label && (
              <ThemedText type="smallBold" testID="partner-members-count">
                {partner.members_label}
              </ThemedText>
            )}
            {(partner.members ?? []).map((member) => (
              <MemberRow key={member.id} member={member} onPress={() => setOpen(member)} />
            ))}
          </ScrollView>
          {/* Dans la fenêtre du panneau « Membres » : il s'ouvre par-dessus. */}
          <BottomSheet visible={open !== null} title={open?.name ?? ''} fitContent onClose={() => setOpen(null)} testID="partner-member-sheet">
            {open && <MemberCard member={open} />}
          </BottomSheet>
        </>
      )}
    </PartnerLoader>
  );
}

function MemberRow({ member, onPress }: { member: PartnerMember; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.backgroundSelected }, pressed && styles.pressed]}
      testID={`partner-member-${member.id}`}>
      <Avatar user={{ initials: member.initials, avatar_url: member.photo }} size={AVATAR_SIZE} />
      <ThemedText style={styles.name} numberOfLines={1} testID={`partner-member-${member.id}-name`}>
        {member.name}
      </ThemedText>
      {member.tag && <StatusTag tag={member.tag} testID={`partner-member-${member.id}-tag`} />}
    </Pressable>
  );
}

/** Un membre : sa photo, son nom et, s'il l'est, « Administrateur » ; puis son téléphone et son e-mail, qui ouvrent l'appel et l'e-mail. */
function MemberCard({ member }: { member: PartnerMember }) {
  const { t } = useI18n();

  return (
    <View style={styles.card} testID="partner-member-card">
      <View style={styles.identity}>
        <Avatar user={{ initials: member.initials, avatar_url: member.photo }} size={MEMBER_PHOTO_SIZE} />
        <ThemedText type="subtitle" style={styles.centered} testID="partner-member-card-name">
          {member.name}
        </ThemedText>
        {/* Sous son nom, la pastille verte « Administrateur » s'il l'est (décision 2026-11-27-membre-panneau-administrateur). */}
        {member.tag && <StatusTag tag={member.tag} style={styles.centeredTag} testID="partner-member-card-tag" />}
      </View>
      {member.phone && <ContactRow label={t('partners.phone')} value={member.phone} url={`tel:${member.phone.replace(/\s/g, '')}`} testID="partner-member-card-phone" />}
      {member.email && <ContactRow label={t('partners.email')} value={member.email} url={`mailto:${member.email}`} testID="partner-member-card-email" />}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  body: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: 1 },
  name: { flex: 1 },
  pressed: { opacity: 0.6 },
  card: { padding: Spacing.four, gap: Spacing.three },
  identity: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  centered: { textAlign: 'center' },
  // Centrée sous le nom : la pastille se cale à gauche par défaut.
  centeredTag: { alignSelf: 'center' },
});
