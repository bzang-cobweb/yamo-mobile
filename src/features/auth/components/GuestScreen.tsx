import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/shared/components/BackHeader';
import { FixedFooterLayout } from '@/shared/components/FixedFooterLayout';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

type Props = PropsWithChildren<{
  /** Titre de l'en-tête fixe (flèche de retour, titre centré) ; sans titre, aucun en-tête. */
  title?: string;
  /** Dans un onglet, sous sa barre du haut : ni en-tête ni marge du haut (décision 2026-11-27-visiteur-onglets). */
  embedded?: boolean;
}>;

/** Mise en page des écrans d'invité (connexion, inscription, mot de passe oublié). */
export function GuestScreen({ title, embedded = false, children }: Props) {
  // Le bouton du formulaire, fixé en bas, avec la marge du bas de l'écran
  // (décision 2026-11-19-contrat-bouton-fixe-formulaires).
  const content = (
    <FixedFooterLayout contentStyle={styles.content} bottomInset>
      {children}
    </FixedFooterLayout>
  );

  if (embedded) {
    return <ThemedView style={styles.container}>{content}</ThemedView>;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {title === undefined ? (
          content
        ) : (
          <BackStackProvider>
            <BackHeader title={title} />
            {content}
          </BackStackProvider>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
});
