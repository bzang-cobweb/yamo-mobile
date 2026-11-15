import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

export type AvailableLocale = { code: string; label: string };
export type LocalesResponse = { data: AvailableLocale[]; default: string };

/** Langues proposées par l'API. Une méthode par appel. */
export class LocaleService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/locales` — public. */
  list(): Promise<LocalesResponse> {
    return this.client.get<LocalesResponse>('/v1/locales');
  }
}

export const localeService = new LocaleService();
