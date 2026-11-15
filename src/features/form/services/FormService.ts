import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { FormDefinition, FormResponse } from '../types';

/** Définitions des formulaires servies par l'API. Une méthode par appel. */
export class FormService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/forms/{name}` — libellés dans la langue de la requête. */
  async get(name: string): Promise<FormDefinition> {
    return (await this.client.get<FormResponse>(`/v1/forms/${encodeURIComponent(name)}`)).data;
  }
}

export const formService = new FormService();
