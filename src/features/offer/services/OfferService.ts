import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { OfferDetail, OfferDetailResponse, OfferReviewPage } from '../types';

/** Offres servies par l'API. Une méthode par appel. */
export class OfferService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/offers/{id}` — la fiche, ouverte sans connexion. */
  async get(id: string): Promise<OfferDetail> {
    return (await this.client.get<OfferDetailResponse>(`/v1/offers/${encodeURIComponent(id)}`)).data;
  }

  /** `GET /api/v1/offers/{id}/reviews` — une page de tous ses avis, du plus récent au plus ancien (décision 2026-11-19-nuit-tous-les-avis). */
  async reviews(id: string, cursor: string | null = null): Promise<OfferReviewPage> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';

    return (await this.client.get<{ data: OfferReviewPage }>(`/v1/offers/${encodeURIComponent(id)}/reviews${query}`)).data;
  }
}

export const offerService = new OfferService();
