import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { OfferDetail, OfferDetailResponse } from '../types';

/** Offres servies par l'API. Une méthode par appel. */
export class OfferService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/offers/{id}` — la fiche, ouverte sans connexion. */
  async get(id: string): Promise<OfferDetail> {
    return (await this.client.get<OfferDetailResponse>(`/v1/offers/${encodeURIComponent(id)}`)).data;
  }
}

export const offerService = new OfferService();
