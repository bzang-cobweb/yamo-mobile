import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { FieldSuggestion, FormDefinition, FormResponse, FormValues } from '../types';

/** Point d'API de suggestions accepté : relatif à l'API, sans paramètre ni remontée. */
const SUGGESTIONS_ENDPOINT = /^\/v1\/[a-z0-9/_-]+$/;

/** Définitions des formulaires servies par l'API. Une méthode par appel. */
export class FormService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `GET /api/v1/forms/{name}` — libellés dans la langue de la requête. `record`
   * lie le formulaire à un enregistrement (une adresse) : prérempli, et envoyé
   * pour le modifier.
   */
  async get(name: string, record?: string): Promise<FormDefinition> {
    const query = record ? `?record=${encodeURIComponent(record)}` : '';

    return (await this.client.get<FormResponse>(`/v1/forms/${encodeURIComponent(name)}${query}`)).data;
  }

  /**
   * `POST /api/v1/forms/{name}/steps/{step}` — valide les champs d'une étape (à
   * partir de 1) sans rien enregistrer ; une étape invalide lève une `ApiError` 422.
   */
  async validateStep(name: string, step: number, values: FormValues): Promise<void> {
    await this.client.post<void>(`/v1/forms/${encodeURIComponent(name)}/steps/${step}`, values);
  }

  /**
   * Suggestions pour la saisie `query` d'un champ (décision
   * 2026-11-19-contrat-adresse-offre-recherche) : `GET <endpoint>?q=…`. Un point
   * d'API d'une autre forme est refusé.
   */
  async suggestions(endpoint: string, query: string): Promise<FieldSuggestion[]> {
    if (!SUGGESTIONS_ENDPOINT.test(endpoint) || endpoint.includes('..')) {
      throw new Error(`Point d'API refusé : ${endpoint}`);
    }

    return (await this.client.get<{ data: FieldSuggestion[] }>(`${endpoint}?q=${encodeURIComponent(query)}`)).data;
  }
}

export const formService = new FormService();
