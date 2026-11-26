import { StyleSheet } from 'react-native';

import { useFormDefinition } from '@/features/form/hooks/useFormDefinition';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { FixedFooterLayout } from '@/shared/components/FixedFooterLayout';
import { ToastHost } from '@/shared/components/Toast';
import { Spacing } from '@/shared/theme/theme';

import { formTitle, ProfileForm, profileContentStyle } from '../screens/ProfileFormScreen';

/** Le lien d'un formulaire du profil (`/profile/offer.booking.cancel?record=9`) : son nom et son enregistrement. */
const PROFILE_FORM_LINK = /^\/profile\/([^/?#]+)(?:\?record=([^&#]+))?$/;

/** Le formulaire du profil que désigne `link`, ou `null` si c'est un autre lien. */
export function profileFormLink(link: string): { form: string; record?: string } | null {
  const match = PROFILE_FORM_LINK.exec(link);

  return match ? { form: decodeURIComponent(match[1]), record: match[2] ? decodeURIComponent(match[2]) : undefined } : null;
}

type Props = {
  /** Le lien du formulaire à ouvrir (`/profile/offer.booking.edit?record=9`) ; `null` : fermé. */
  link: string | null;
  onClose: () => void;
  /** Envoyé : le message du serveur (« Demande modifiée. »). Le panneau ne se ferme pas seul. */
  onDone: (message: string) => void;
  /** Vrai : le panneau prend la hauteur du formulaire (un message, quelques champs) ; faux : sa taille maximale. */
  fitContent?: boolean;
  testID?: string;
};

/**
 * Un formulaire du profil dans un panneau, au lieu d'un écran (décision 2026-11-26-formulaires-en-panneau) : le titre
 * du formulaire en tête, ses champs qui défilent, son bouton d'envoi fixé en bas du panneau, le bandeau des messages
 * par-dessus.
 */
export function ProfileFormSheet({ link, ...props }: Props) {
  const target = link === null ? null : profileFormLink(link);

  return target === null ? null : <FormSheet key={link ?? ''} {...target} {...props} />;
}

function FormSheet({ form, record, onClose, onDone, fitContent = false, testID = 'profile-form-sheet' }: Omit<Props, 'link'> & { form: string; record?: string }) {
  const definition = useFormDefinition(form, record);

  return (
    <BottomSheet visible title={formTitle(definition.data)} onClose={onClose} fitContent={fitContent} overlay={<ToastHost announce={false} />} testID={testID}>
      <FixedFooterLayout contentStyle={styles.content} fit={fitContent} testID={`${testID}-scroll`}>
        <ProfileForm form={form} record={record} onDone={({ message }) => onDone(message)} />
      </FixedFooterLayout>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { ...profileContentStyle, gap: Spacing.three },
});
