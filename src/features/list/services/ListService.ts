import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { ListDefinition, ListResponse } from '../types';

/** Listes servies par l'API. */
export class ListService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `GET /api/v1/lists/{name}` — une page de la liste, textes dans la langue du
   * compte : la première sans curseur, sinon celle qui suit `cursor` ; restreinte
   * à `search` si la recherche n'est pas vide (décision 2026-11-18-recherche-dans-la-liste).
   */
  async get(name: string, cursor?: string | null, search?: string): Promise<ListDefinition> {
    const params = [
      cursor ? `cursor=${encodeURIComponent(cursor)}` : null,
      search?.trim() ? `search=${encodeURIComponent(search.trim())}` : null,
    ].filter((param) => param !== null);
    const query = params.length > 0 ? `?${params.join('&')}` : '';

    return (await this.client.get<ListResponse>(`/v1/lists/${encodeURIComponent(name)}${query}`)).data;
  }
}

export const listService = new ListService();
