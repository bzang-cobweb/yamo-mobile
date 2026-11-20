import { useEffect, useState } from 'react';

/** Pause après la dernière frappe avant d'envoyer la recherche. */
export const SEARCH_DELAY = 300;

/** `value`, une fois qu'il n'a plus changé pendant `delay` ms (une recherche qu'on tape). */
export function useDebounced<T>(value: T, delay: number = SEARCH_DELAY): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
