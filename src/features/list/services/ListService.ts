import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { ListDefinition, ListResponse } from '../types';

/** Listes servies par l'API. */
export class ListService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `GET /api/v1/lists/{name}` — une page de la liste, textes dans la langue du
   * compte : la première sans curseur, sinon celle qui suit `cursor`.
   */
  async get(name: string, cursor?: string | null): Promise<ListDefinition> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';

    return (await this.client.get<ListResponse>(`/v1/lists/${encodeURIComponent(name)}${query}`)).data;
  }
}

export const listService = new ListService();
