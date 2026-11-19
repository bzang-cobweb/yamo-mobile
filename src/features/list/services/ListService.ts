import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { FormValues } from '@/features/form/types';

import type { ListDefinition, ListResponse } from '../types';

/** Point d'API d'un cœur de favori : `/v1/offers/12/favorite`. */
const FAVORITE_ENDPOINT = /^\/v1\/[a-z-]+\/\d+\/favorite$/;

/** Écran de l'app qu'un item peut ouvrir : la fiche d'une entité, `/offers/12`. */
export const ITEM_LINK = /^\/[a-z-]+\/\d+$/;

/** `filter[nom]`, crochets encodés : `filter%5Bnom%5D`. */
function filterName(key: string): string {
  return `filter%5B${encodeURIComponent(key)}%5D`;
}

/** Listes servies par l'API. */
export class ListService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `GET /api/v1/lists/{name}` — une page de la liste, textes dans la langue du
   * compte : la première sans curseur, sinon celle qui suit `cursor` ; restreinte
   * à `search` si la recherche n'est pas vide (décision 2026-11-18-recherche-dans-la-liste).
   */
  async get(name: string, cursor?: string | null, search?: string, filters: FormValues = {}): Promise<ListDefinition> {
    const params = [
      cursor ? `cursor=${encodeURIComponent(cursor)}` : null,
      search?.trim() ? `search=${encodeURIComponent(search.trim())}` : null,
      // `filter[ville]=Douala`, `filter[type][]=studio` (décision 2026-11-19-contrat-filtres-vitrine).
      // Les crochets sont encodés aussi : laissés bruts, l'adresse est invalide et iOS la
      // réencode en entier, « Yaoundé » devenant « Yaound%25C3%25A9 », un filtre qui ne trouve rien.
      ...Object.entries(filters).flatMap(([key, value]) =>
        Array.isArray(value)
          ? // Une liste de groupes n'est pas un filtre : seules les valeurs simples partent.
            value.filter((item): item is string => typeof item === 'string').map((item) => `${filterName(key)}%5B%5D=${encodeURIComponent(item)}`)
          : [`${filterName(key)}=${encodeURIComponent(String(value))}`],
      ),
    ].filter((param) => param !== null);
    const query = params.length > 0 ? `?${params.join('&')}` : '';

    return (await this.client.get<ListResponse>(`/v1/lists/${encodeURIComponent(name)}${query}`)).data;
  }

  /**
   * Cœur de favori : PUT sur `endpoint` pour ajouter, DELETE pour retirer (décision
   * 2026-11-19-contrat-vedette-favoris). Seul un point d'API de favori est accepté
   * (`/v1/<entité>/<id>/favorite`), jamais une autre route.
   */
  async setFavorite(endpoint: string, active: boolean): Promise<void> {
    if (!FAVORITE_ENDPOINT.test(endpoint)) {
      throw new Error(`Point d'API refusé : ${endpoint}`);
    }

    await (active ? this.client.request<unknown>(endpoint, { method: 'PUT' }) : this.client.delete<unknown>(endpoint));
  }
}

export const listService = new ListService();
