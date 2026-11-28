import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';

import { BottomSheet } from '@/shared/components/BottomSheet';
import { FixedFooterLayout } from '@/shared/components/FixedFooterLayout';
import { ToastHost } from '@/shared/components/Toast';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';
import { AuthFlow } from './AuthFlow';

/**
 * « Se connecter ou s'inscrire » dans un panneau à sa taille maximale, le même depuis toute l'app (décision
 * 2026-11-28-app-connexion-panneau) : le bouton des onglets d'un visiteur, « Réserver » ou le bouton d'une section de
 * la fiche, « Devenir partenaire »… appellent {@link openAuthSheet} ; l'unique {@link AuthSheetHost}, posé une fois au
 * niveau de l'app, affiche le parcours. Comme le bandeau des messages : un état du module, sans fournisseur à traverser.
 */
let open = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/** Ouvre le panneau de connexion (sans effet pour un membre déjà connecté). */
export function openAuthSheet() {
  open = true;
  emit();
}

/** Ferme le panneau (la croix, le fond, la connexion achevée). */
export function closeAuthSheet() {
  open = false;
  emit();
}

/** Le panneau est-il ouvert ? (tests) */
export function isAuthSheetOpen(): boolean {
  return open;
}

/**
 * L'emplacement du panneau, posé une fois au niveau de toute l'app. Le parcours naît à chaque ouverture : il repart de
 * « Bon retour » ou du formulaire. Connecté, rien ne s'affiche.
 */
export function AuthSheetHost() {
  const visible = useSyncExternalStore(subscribe, () => open);
  const { user, t } = useAuth();

  // Connecté par un autre chemin (compte récupéré) : le panneau ne revient pas après une déconnexion.
  useEffect(() => {
    if (user !== null && open) {
      closeAuthSheet();
    }
  }, [user, visible]);

  if (!visible || user !== null) {
    return null;
  }

  return (
    <BottomSheet visible title={t('auth.signInOrUp')} onClose={closeAuthSheet} overlay={<ToastHost announce={false} />} testID="auth-sheet">
      <FixedFooterLayout contentStyle={styles.content} testID="auth-sheet-scroll">
        <AuthFlow onDone={closeAuthSheet} />
      </FixedFooterLayout>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', gap: Spacing.three, padding: Spacing.four },
});
