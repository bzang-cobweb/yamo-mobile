import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { Partner } from '../types';

/** Les partenaires de l'accueil, servis sans compte (décision 2026-11-23-module-partenaires). */
export class PartnerService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/partners` — les partenaires visibles du pays, dans leur ordre ; chacun compte une vue. */
  async list(): Promise<Partner[]> {
    return (await this.client.get<{ data: Partner[] }>('/v1/partners')).data;
  }

  /** `POST /api/v1/partners/{id}/click` — un toucher sur un partenaire compte un clic. */
  async click(id: string): Promise<void> {
    await this.client.post(`/v1/partners/${encodeURIComponent(id)}/click`);
  }
}

export const partnerService = new PartnerService();
