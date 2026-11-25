import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

type Entry = { id: number; run: () => void };

type BackStackValue = {
  /** Inscrit un retour d'étape ; renvoie de quoi le retirer. */
  push: (entry: Entry) => () => void;
  /** Retour : la dernière étape inscrite, sinon l'écran précédent. */
  back: () => void;
  /** L'étape (0, 1…) du formulaire à étapes de l'écran ; `null` : pas de formulaire à étapes (décision 2026-11-25-croix-formulaire-etapes). */
  formStep: number | null;
  setFormStep: (step: number | null) => void;
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
  const [formStep, setFormStep] = useState<number | null>(null);

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

  const value = useMemo(() => ({ push, back, formStep, setFormStep }), [push, back, formStep]);

  return <BackStackContext.Provider value={value}>{children}</BackStackContext.Provider>;
}

/**
 * Un formulaire à étapes donne son étape à l'en-tête, qui y montre la croix de fermeture à partir de la 2e (décision 2026-11-25-croix-formulaire-etapes).
 * `null` : pas d'étapes.
 */
export function useFormStep(step: number | null): void {
  const context = useContext(BackStackContext);
  const setFormStep = context?.setFormStep;

  useEffect(() => {
    setFormStep?.(step);

    return () => setFormStep?.(null);
  }, [setFormStep, step]);
}

/** L'étape du formulaire à étapes de l'écran, pour l'en-tête ; `null` sans formulaire à étapes. */
export function useCurrentFormStep(): number | null {
  return useContext(BackStackContext)?.formStep ?? null;
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
