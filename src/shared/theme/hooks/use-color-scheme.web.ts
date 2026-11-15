import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribe = () => () => {};

/**
 * Rendu statique du web : le serveur ne connaît pas le thème du navigateur.
 * `useSyncExternalStore` renvoie `false` au rendu serveur et à l'hydratation,
 * puis `true` côté client — sans setState dans un effet.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
