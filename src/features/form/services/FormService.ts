import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { FormDefinition, FormResponse, FormValues } from '../types';

/** Définitions des formulaires servies par l'API. Une méthode par appel. */
export class FormService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/forms/{name}` — libellés dans la langue de la requête. */
  async get(name: string): Promise<FormDefinition> {
    return (await this.client.get<FormResponse>(`/v1/forms/${encodeURIComponent(name)}`)).data;
  }

  /**
   * `POST /api/v1/forms/{name}/steps/{step}` — valide les champs d'une étape (à
   * partir de 1) sans rien enregistrer ; une étape invalide lève une `ApiError` 422.
   */
  async validateStep(name: string, step: number, values: FormValues): Promise<void> {
    await this.client.post<void>(`/v1/forms/${encodeURIComponent(name)}/steps/${step}`, values);
  }
}

export const formService = new FormService();
