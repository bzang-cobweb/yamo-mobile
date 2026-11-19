import { createContext, useContext } from 'react';

import type { Country } from '../types';

export type CountryContextValue = {
  /** Pays et choix gardé lus, liste des pays chargée. */
  ready: boolean;
  /** La liste des pays n'a pas pu être chargée (hors ligne, serveur injoignable). */
  failed: boolean;
  retry: () => void;
  countries: Country[];
  /** Le pays courant, une fois entré ; `null` tant que l'écran d'entrée est affiché. */
  country: Country | null;
  /** Le pays gardé (toujours ouvert), même écran d'entrée affiché : présélectionné. */
  chosen: Country | null;
  /** Entrer dans un pays : gardé sur l'appareil, envoyé à l'API, données rechargées. */
  enter: (code: string) => void;
};

export const CountryContext = createContext<CountryContextValue>({
  ready: false,
  failed: false,
  retry: () => undefined,
  countries: [],
  country: null,
  chosen: null,
  enter: () => undefined,
});

export function useCountry(): CountryContextValue {
  return useContext(CountryContext);
}
