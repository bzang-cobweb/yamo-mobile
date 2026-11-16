import { onlineManager } from '@tanstack/react-query';
import { addNetworkStateListener, useNetworkState, type NetworkState } from 'expo-network';

/**
 * L'appareil a-t-il internet ? Tant que l'état n'est pas connu (`undefined`), on le
 * suppose en ligne : l'écran hors ligne ne clignote pas au démarrage.
 */
export function isOnline(state: Pick<NetworkState, 'isConnected' | 'isInternetReachable'>): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

/** État de la connexion, mis à jour à chaque changement. */
export function useIsOnline(): boolean {
  return isOnline(useNetworkState());
}

/**
 * Relie la file de requêtes à l'état du réseau : hors ligne, les requêtes sont mises
 * en attente ; au retour d'internet, elles reprennent d'elles-mêmes.
 */
export function bindQueriesToNetwork(): void {
  onlineManager.setEventListener((setOnline) => {
    const subscription = addNetworkStateListener((state) => setOnline(isOnline(state)));

    return () => subscription.remove();
  });
}
