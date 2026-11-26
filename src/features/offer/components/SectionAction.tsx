import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ProfileFormSheet, profileFormLink } from '@/features/auth/components/ProfileFormSheet';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { showToast } from '@/shared/components/Toast';
import { APP_LINK } from '@/features/notification/components/NotificationText';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { OfferSectionAction } from '../types';

/**
 * Le bouton d'une section de la fiche, servi par Laravel (« Envoyer un message » dans « Éditeur », décision
 * 2026-11-26-messages-editeur) : bordé, sur toute la largeur, comme « Voir tous les avis ». Il ouvre le lien de
 * l'app ; un visiteur passe d'abord par la connexion, comme pour « Réserver ». Un lien qui n'est pas de l'app est
 * ignoré. Un formulaire du profil (« Envoyer un message ») s'ouvre dans un panneau à la hauteur du formulaire ; envoyé,
 * le panneau se ferme et le message du serveur s'affiche (décision 2026-11-26-message-editeur-en-panneau).
 */
export function SectionAction({ action, testID }: { action: OfferSectionAction; testID?: string }) {
  const theme = useTheme();
  const { user } = useAuth();
  const [form, setForm] = useState<string | null>(null);

  if (!APP_LINK.test(action.link)) {
    return null;
  }

  function open() {
    if (user === null) {
      router.push('/sign-in');
    } else if (profileFormLink(action.link) !== null) {
      setForm(action.link);
    } else {
      router.push(action.link as Href);
    }
  }

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={open}
        style={({ pressed }) => [styles.button, { borderColor: theme.primary }, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          {action.label}
        </ThemedText>
      </Pressable>
      <ProfileFormSheet
        link={form}
        fitContent
        onClose={() => setForm(null)}
        onDone={(message) => {
          setForm(null);
          showToast(message);
        }}
        testID={testID ? `${testID}-form` : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'stretch', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: Spacing.three, marginTop: Spacing.two },
  pressed: { opacity: 0.6 },
});
