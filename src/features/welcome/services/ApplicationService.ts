import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Application } from '../types';

/** Présentation de l'application servie par l'API. Une méthode par appel. */
export class ApplicationService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/app` — public ; description dans la langue de l'app. */
  async get(): Promise<Application> {
    return (await this.client.get<{ data: Application }>('/v1/app')).data;
  }
}

export const applicationService = new ApplicationService();
