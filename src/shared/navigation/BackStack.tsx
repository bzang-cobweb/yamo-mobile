import { router, useNavigationContainerRef, useRootNavigationState } from 'expo-router';
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

/** Ce qu'il faut de l'état de navigation : des piles et des onglets imbriqués. */
type NavState = { type?: string; key?: string; index?: number; routes: readonly { state?: unknown }[] };

function asState(state: unknown): NavState | undefined {
  return state && typeof state === 'object' && 'routes' in state ? (state as NavState) : undefined;
}

/**
 * Combien d'écrans remonter pour revenir à l'écran de départ, piles imbriquées
 * comprises (la pile principale, celle de l'onglet ouvert). Un onglet ne compte pas :
 * seul celui qui est ouvert est parcouru.
 */
export function screensDeep(value: unknown): number {
  const state = asState(value);

  if (!state) {
    return 0;
  }

  const index = state.index ?? 0;

  if (state.type === 'stack') {
    return index + state.routes.slice(0, index + 1).reduce((sum, route) => sum + screensDeep(route.state), 0);
  }

  return screensDeep(state.routes[index]?.state);
}

/** Les piles à ramener à leur premier écran pour revenir au départ, les plus profondes d'abord. */
function stacksToReset(value: unknown): string[] {
  const state = asState(value);

  if (!state) {
    return [];
  }

  const index = state.index ?? 0;

  if (state.type === 'stack') {
    return [...stacksToReset(state.routes[0]?.state), ...(index > 0 && state.key ? [state.key] : [])];
  }

  return stacksToReset(state.routes[index]?.state);
}

/**
 * Fermer : revenir d'un coup à l'écran de départ (décision 2026-11-19-croix-fermer),
 * quand on s'en est éloigné de plus d'un écran ; `null` sinon (la flèche suffit).
 */
export function useClose(): (() => void) | null {
  const state = useRootNavigationState();
  const container = useNavigationContainerRef();

  if (screensDeep(state) < 2) {
    return null;
  }

  return () => {
    for (const key of stacksToReset(container.getRootState())) {
      container.dispatch({ type: 'POP_TO_TOP', target: key });
    }
  };
}
