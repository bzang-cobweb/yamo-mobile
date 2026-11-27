import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { HomePartners, Partner, PartnerBecome } from '../types';

/** Les partenaires de l'accueil, servis sans compte (décision 2026-11-23-module-partenaires). */
export class PartnerService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `GET /api/v1/partners` — les partenaires visibles du pays, dans leur ordre ; chacun compte une vue. Avec l'action
   * « Devenir partenaire » (décision 2026-11-25-accueil-carte-devenir-partenaire).
   */
  async list(): Promise<HomePartners> {
    const response = await this.client.get<{ data: Partner[]; meta?: { become?: PartnerBecome | null } }>('/v1/partners');

    return { partners: response.data, become: response.meta?.become ?? null };
  }

  /** `GET /api/v1/partners/{id}` — un partenaire visible (décision 2026-11-23-partenaires-liste-detail). */
  async get(id: string): Promise<Partner> {
    return (await this.client.get<{ data: Partner }>(`/v1/partners/${encodeURIComponent(id)}`)).data;
  }

  /**
   * `PATCH /api/v1/partners/{id}/members/{userId}` — fait ou défait un administrateur, par un autre administrateur
   * (décision 2026-11-27-membre-administrateur).
   */
  async setAdmin(id: string, userId: string, isAdmin: boolean): Promise<void> {
    await this.client.patch(`/v1/partners/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { is_admin: isAdmin });
  }

  /** `DELETE /api/v1/partners/{id}/members/{userId}` — retire un autre compte, par un administrateur (décision 2026-11-27-membre-retirer). */
  async removeMember(id: string, userId: string): Promise<void> {
    await this.client.delete(`/v1/partners/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`);
  }

  /** `POST /api/v1/partners/{id}/click` — un toucher sur un partenaire compte un clic. */
  async click(id: string): Promise<void> {
    await this.client.post(`/v1/partners/${encodeURIComponent(id)}/click`);
  }
}

export const partnerService = new PartnerService();
