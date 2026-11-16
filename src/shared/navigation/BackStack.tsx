import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type PropsWithChildren } from 'react';

type Entry = { id: number; run: () => void };

type BackStackValue = {
  /** Inscrit un retour d'étape ; renvoie de quoi le retirer. */
  push: (entry: Entry) => () => void;
  /** Retour : la dernière étape inscrite, sinon l'écran précédent. */
  back: () => void;
};

const BackStackContext = createContext<BackStackValue | null>(null);

let nextId = 0;

/**
 * Retours d'un écran à en-tête (`BackHeader`). Un formulaire à étapes ou l'étape de
 * code y inscrivent « revenir à l'étape précédente » tant qu'ils en ont une ; la
 * flèche de l'en-tête exécute la dernière inscrite, sinon revient à l'écran précédent.
 */
export function BackStackProvider({ children }: PropsWithChildren) {
  const stack = useRef<Entry[]>([]);

  const push = useCallback((entry: Entry) => {
    stack.current = [...stack.current, entry];

    return () => {
      stack.current = stack.current.filter((item) => item.id !== entry.id);
    };
  }, []);

  const back = useCallback(() => {
    const top = stack.current.at(-1);

    if (top) {
      top.run();
    } else {
      router.back();
    }
  }, []);

  const value = useMemo(() => ({ push, back }), [push, back]);

  return <BackStackContext.Provider value={value}>{children}</BackStackContext.Provider>;
}

/** Retour de l'en-tête : étape précédente s'il y en a une, sinon écran précédent. */
export function useBack(): () => void {
  return useContext(BackStackContext)?.back ?? (() => router.back());
}

/**
 * Inscrit `run` comme retour d'étape tant que `active` est vrai. Renvoie `true` si
 * l'écran a un en-tête de retour : le composant n'affiche alors pas son propre lien.
 */
export function useBackStep(active: boolean, run: () => void): boolean {
  const context = useContext(BackStackContext);
  const latest = useRef(run);

  useEffect(() => {
    latest.current = run;
  });

  useEffect(() => {
    if (!context || !active) {
      return undefined;
    }

    nextId += 1;

    return context.push({ id: nextId, run: () => latest.current() });
  }, [active, context]);

  return context !== null;
}
