import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { APP_LINK } from '@/features/notification/components/NotificationText';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { OfferSectionAction } from '../types';

/**
 * Le bouton d'une section de la fiche, servi par Laravel (« Envoyer un message » dans « Éditeur », décision
 * 2026-11-26-messages-editeur) : bordé, sur toute la largeur, comme « Voir tous les avis ». Il ouvre le lien de
 * l'app ; un visiteur passe d'abord par la connexion, comme pour « Réserver ». Un lien qui n'est pas de l'app est
 * ignoré.
 */
export function SectionAction({ action, testID }: { action: OfferSectionAction; testID?: string }) {
  const theme = useTheme();
  const { user } = useAuth();

  if (!APP_LINK.test(action.link)) {
    return null;
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={() => router.push((user === null ? '/sign-in' : action.link) as Href)}
      style={({ pressed }) => [styles.button, { borderColor: theme.primary }, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={{ color: theme.primary }}>
        {action.label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'stretch', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: Spacing.three, marginTop: Spacing.two },
  pressed: { opacity: 0.6 },
});
