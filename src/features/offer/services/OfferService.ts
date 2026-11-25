import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { HomeData, MemberProfile, OfferCalendarDayPanel, OfferCalendarMonth, OfferDetail, OfferDetailResponse, OfferReviewPage } from '../types';

/** Offres servies par l'API. Une méthode par appel. */
export class OfferService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * `GET /api/v1/home` — l'accueil : le bloc « À la une » (décision 2026-11-25-bloc-a-la-une), puis un carrousel par
   * ville, 10 offres au hasard (décision 2026-11-23-accueil-carrousels-par-ville). Une API plus ancienne n'a pas le bloc.
   */
  async home(): Promise<HomeData> {
    const { data } = await this.client.get<{ data: Partial<HomeData> }>('/v1/home');

    return { featured: data.featured ?? [], carousels: data.carousels ?? [] };
  }

  /** `GET /api/v1/offers/{id}` — la fiche, ouverte sans connexion. */
  async get(id: string): Promise<OfferDetail> {
    return (await this.client.get<OfferDetailResponse>(`/v1/offers/${encodeURIComponent(id)}`)).data;
  }

  /** `GET /api/v1/offers/{id}/reviews` — une page de tous ses avis, du plus récent au plus ancien (décision 2026-11-19-nuit-tous-les-avis). */
  async reviews(id: string, cursor: string | null = null): Promise<OfferReviewPage> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';

    return (await this.client.get<{ data: OfferReviewPage }>(`/v1/offers/${encodeURIComponent(id)}/reviews${query}`)).data;
  }

  /** `GET /api/v1/offers/{id}/calendar?month=AAAA-MM` — un mois de son calendrier, pour son propriétaire (décision 2026-11-19-contrat-calendrier-offre). */
  async calendar(id: string, month: string | null): Promise<OfferCalendarMonth> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';

    return (await this.client.get<{ data: OfferCalendarMonth }>(`/v1/offers/${encodeURIComponent(id)}/calendar${query}`)).data;
  }

  /** `GET /api/v1/offers/{id}/calendar/{date}` — le panneau d'un jour. */
  async calendarDay(id: string, date: string): Promise<OfferCalendarDayPanel> {
    return (await this.client.get<{ data: OfferCalendarDayPanel }>(`/v1/offers/${encodeURIComponent(id)}/calendar/${encodeURIComponent(date)}`)).data;
  }

  /** `GET /api/v1/members/{id}` — la page publique d'un membre (décision 2026-11-19-page-membre). */
  async member(id: string): Promise<MemberProfile> {
    return (await this.client.get<{ data: MemberProfile }>(`/v1/members/${encodeURIComponent(id)}`)).data;
  }
}

export const offerService = new OfferService();
