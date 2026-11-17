import type { FormSubmit } from '@/features/form/types';

/**
 * Retrait d'un item : libellé du bouton, question de confirmation, et envoi
 * décrit comme celui d'un formulaire (méthode, point d'API, suite).
 */
export type ListItemDelete = Omit<FormSubmit, 'label'> & { label: string; confirm: string };

/** Un item d'une liste : titre, sous-titre, formulaire d'édition, retrait. */
export type ListItem = {
  id: string;
  title: string;
  subtitle: string | null;
  /** Toucher l'item ouvre ce formulaire, lié à l'enregistrement `record`. */
  edit: { form: string; record: string } | null;
  delete: ListItemDelete | null;
};

/**
 * Une liste décrite par l'API (`GET /api/v1/lists/{name}`), que l'app affiche
 * sans la connaître d'avance (décision 2026-11-18-adresses-liste-generique).
 */
export type ListDefinition = {
  name: string;
  title: string;
  /** Texte affiché quand la liste est vide. */
  empty: string | null;
  /** Bouton de création : libellé et formulaire ouvert ; `null` pour une liste en lecture seule. */
  create: { label: string; form: string } | null;
  items: ListItem[];
};

export type ListResponse = { data: ListDefinition };
