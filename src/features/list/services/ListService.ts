import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { ListDefinition, ListResponse } from '../types';

/** Listes servies par l'API. */
export class ListService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/lists/{name}` — textes dans la langue du compte. */
  async get(name: string): Promise<ListDefinition> {
    return (await this.client.get<ListResponse>(`/v1/lists/${encodeURIComponent(name)}`)).data;
  }
}

export const listService = new ListService();
