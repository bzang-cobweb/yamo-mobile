import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { OfflineScreen } from './OfflineScreen';

type Props = PropsWithChildren<{
  /** Pas d'internet, ou démarrage impossible : l'écran hors ligne s'affiche. */
  offline: boolean;
  onRetry: () => void;
  retrying: boolean;
}>;

/**
 * Affiche l'écran courant si et seulement si l'app peut fonctionner ; sinon l'écran
 * hors ligne. Celui-ci **recouvre** l'app sans la démonter : au retour d'internet,
 * l'utilisateur retrouve son écran dans l'état où il l'avait laissé (navigation,
 * saisie). L'app recouverte est cachée aux lecteurs d'écran et ne reçoit plus les
 * touchers.
 */
export function ConnectivityGate({ offline, onRetry, retrying, children }: Props) {
  return (
    <View style={styles.fill}>
      <View
        style={styles.fill}
        testID="connectivity-content"
        pointerEvents={offline ? 'none' : 'auto'}
        accessibilityElementsHidden={offline}
        importantForAccessibility={offline ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      {offline && (
        <View style={StyleSheet.absoluteFill}>
          <OfflineScreen onRetry={onRetry} retrying={retrying} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
