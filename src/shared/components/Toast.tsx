import { SymbolView } from 'expo-symbols';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TONE_COLORS } from '@/shared/components/StatusTag';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

/**
 * Le message qui suit une action (« Demande envoyée », « Avis publié », une erreur), le même
 * dans toute l'app (décision 2026-11-21-bandeau-messages) : un bandeau flottant sous la barre
 * du haut, par-dessus le contenu, qui ne défile pas. Vert pour une réussite, rouge pour une
 * erreur ; il reste {@link TOAST_DURATION} ms, un toucher le ferme plus tôt, et le lecteur
 * d'écran l'annonce. Il survit au changement d'écran : on l'affiche avant de revenir en arrière.
 */
export type ToastTone = 'success' | 'danger';

export type ToastValue = { id: number; message: string; tone: ToastTone };

/** Combien de temps le bandeau reste affiché. */
export const TOAST_DURATION = 4000;

/** La hauteur de la barre du haut d'un écran, sous laquelle le bandeau se place. */
const HEADER_HEIGHT = 56;

let current: ToastValue | null = null;
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/** Affiche `message` dans le bandeau ; remplace celui qui serait déjà affiché. */
export function showToast(message: string, tone: ToastTone = 'success') {
  counter += 1;
  current = { id: counter, message, tone };
  emit();
}

/** Ferme le bandeau (le toucher, la fin de sa durée). */
export function hideToast(id?: number) {
  if (current !== null && (id === undefined || current.id === id)) {
    current = null;
    emit();
  }
}

/** Le bandeau affiché, ou `null` (tests). */
export function currentToast(): ToastValue | null {
  return current;
}

/**
 * L'emplacement du bandeau, posé une fois au niveau de toute l'app. Une fenêtre native (le
 * panneau d'un jour du calendrier) passe par-dessus : elle pose le sien, sans le faire annoncer
 * une seconde fois (`announce` à faux).
 */
export function ToastHost({ announce = true }: { announce?: boolean } = {}) {
  const toast = useSyncExternalStore(subscribe, () => current);
  const insets = useSafeAreaInsets();
  // Créée une fois, gardée d'un rendu à l'autre.
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (toast === null) {
      return;
    }

    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (announce) {
      AccessibilityInfo.announceForAccessibility(toast.message);
    }
    const timer = setTimeout(() => hideToast(toast.id), TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [toast, opacity, announce]);

  if (toast === null) {
    return null;
  }

  const danger = toast.tone === 'danger';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        { top: insets.top + HEADER_HEIGHT, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] },
      ]}>
      <Pressable
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
        onPress={() => hideToast(toast.id)}
        style={[styles.toast, { backgroundColor: danger ? TONE_COLORS.danger : TONE_COLORS.success }]}
        testID={`toast-${toast.tone}`}>
        <SymbolView
          name={danger ? { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' } : { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
          size={20}
          tintColor="#ffffff"
        />
        <ThemedText style={styles.text} testID="toast-message">
          {toast.message}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.four, zIndex: 1000, elevation: 1000 },
  toast: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  text: { flex: 1, color: '#ffffff', fontWeight: '600' },
});
