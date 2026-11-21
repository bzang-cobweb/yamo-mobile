import { useSyncExternalStore } from 'react';

import type { FieldValue, FormFieldDefinition, FormValues } from '@/features/form/types';

/**
 * Les filtres de chaque liste, gardés tant que l'app est ouverte (décision
 * 2026-11-19-contrat-filtres-vitrine) : les champs servis par l'API et les valeurs
 * choisies, partagés entre la liste et l'écran des filtres.
 */
type Entry = { fields: FormFieldDefinition[]; values: FormValues };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const EMPTY: Entry = { fields: [], values: {} };

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Les champs et les valeurs des filtres de la liste `name`. */
export function useListFilters(name: string): Entry {
  return useSyncExternalStore(subscribe, () => entries.get(name) ?? EMPTY);
}

/** Les champs servis par l'API pour la liste ; les valeurs choisies sont gardées. */
export function setFilterFields(name: string, fields: FormFieldDefinition[]) {
  const current = entries.get(name);

  if (current && JSON.stringify(current.fields) === JSON.stringify(fields)) {
    return;
  }

  entries.set(name, { fields, values: current?.values ?? {} });
  emit();
}

/** Les valeurs choisies ; seules celles qui filtrent sont gardées. */
export function setFilterValues(name: string, values: FormValues) {
  const fields = entries.get(name)?.fields ?? [];

  entries.set(name, { fields, values: activeValues(fields, values) });
  emit();
}

/** Enlève tous les filtres choisis de la liste `name` ; ses champs restent (décision 2026-11-21-onglet-notifications-sans-filtres). */
export function clearFilters(name: string) {
  const current = entries.get(name);

  if (!current || Object.keys(current.values).length === 0) {
    return;
  }

  entries.set(name, { fields: current.fields, values: {} });
  emit();
}

/** Remet tout à zéro (tests). */
export function resetFilters() {
  entries.clear();
  emit();
}

/** Une valeur qui filtre : non vide, et différente de la valeur par défaut du champ (« Tous »). */
function isActive(field: FormFieldDefinition | undefined, value: FieldValue | undefined): boolean {
  // Une liste vide, ou un intervalle aux deux bornes vides, ne filtre rien.
  if (value === undefined || value === '' || value === false || (Array.isArray(value) && value.every((item) => item === ''))) {
    return false;
  }

  return field?.default === undefined || field.default === null || String(field.default) !== String(value);
}

/** Les seules valeurs qui filtrent. */
export function activeValues(fields: FormFieldDefinition[], values: FormValues): FormValues {
  return Object.fromEntries(Object.entries(values).filter(([name, value]) => isActive(fields.find((field) => field.name === name), value)));
}

/**
 * Un filtre caché (`hidden`) : choisi par l'écran qui ouvre la liste (« Demandes » d'un logement), il filtre
 * sans s'afficher, ne compte pas dans le badge et reste après « Réinitialiser » (décision
 * 2026-11-21-demandes-filtre-logement-cache).
 */
export function isFixedFilter(field: FormFieldDefinition): boolean {
  return field.type === 'hidden';
}

/** Les valeurs des filtres cachés. */
export function fixedValues(fields: FormFieldDefinition[], values: FormValues): FormValues {
  return Object.fromEntries(Object.entries(values).filter(([name]) => fields.some((field) => field.name === name && isFixedFilter(field))));
}

/** Le nombre de filtres actifs, pour le badge, sans les filtres cachés ; un intervalle compte pour un. */
export function activeFilterCount(fields: FormFieldDefinition[], values: FormValues): number {
  return Object.keys(activeValues(fields, values)).filter((name) => !fields.some((field) => field.name === name && isFixedFilter(field))).length;
}
