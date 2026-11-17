import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import { isApiPath } from '@/shared/api/paths';

import type { FieldSuggestions, FormDefinition, FormResponse, FormValues, Suggestion, SuggestionsResponse } from '../types';

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

  /** Suggestions d'un champ pendant la saisie. */
  async suggestions(suggestions: FieldSuggestions, query: string, params: Record<string, string>): Promise<Suggestion[]> {
    return fetchSuggestions(this.client, suggestions, query, params);
  }

  /**
   * `POST /api/v1/forms/{name}/steps/{step}` — valide les champs d'une étape (à
   * partir de 1) sans rien enregistrer ; une étape invalide lève une `ApiError` 422.
   */
  async validateStep(name: string, step: number, values: FormValues): Promise<void> {
    await this.client.post<void>(`/v1/forms/${encodeURIComponent(name)}/steps/${step}`, values);
  }
}

/** Une suggestion bien formée : un libellé et des valeurs texte. */
function isSuggestion(value: unknown): value is Suggestion {
  const suggestion = value as Partial<Suggestion> | null;

  return (
    typeof suggestion?.label === 'string' &&
    typeof suggestion.values === 'object' &&
    suggestion.values !== null &&
    Object.values(suggestion.values).every((item) => typeof item === 'string')
  );
}

/**
 * Suggestions d'un champ (décision 2026-11-18-adresse-du-compte-modele) :
 * `GET <endpoint>?q=…&<param>=…`. Un point d'API hors de `/v1/…` n'est pas appelé,
 * et une suggestion mal formée est ignorée.
 */
export async function fetchSuggestions(
  client: ApiClient,
  { endpoint }: FieldSuggestions,
  query: string,
  params: Record<string, string>,
): Promise<Suggestion[]> {
  if (!isApiPath(endpoint)) {
    return [];
  }

  const search = new URLSearchParams({ q: query, ...Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '')) });
  const response = await client.get<SuggestionsResponse>(`${endpoint}?${search.toString()}`);

  return Array.isArray(response?.data) ? response.data.filter(isSuggestion) : [];
}

export const formService = new FormService();
