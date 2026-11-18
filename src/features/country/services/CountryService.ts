import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { CountriesResponse, Country } from '../types';

/** Pays proposés à l'entrée, servis par l'API avant toute connexion. */
export class CountryService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/countries` — pays ouverts, noms dans la langue de l'app. */
  async list(): Promise<Country[]> {
    return (await this.client.get<CountriesResponse>('/v1/countries')).data;
  }
}

export const countryService = new CountryService();
