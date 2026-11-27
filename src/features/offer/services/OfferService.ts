import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { HomeData, HomeRecent, MemberProfile, OfferCalendarDayPanel, OfferCalendarMonth, OfferDetail, OfferDetailResponse } from '../types';

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

  /**
   * `GET /api/v1/wishlists/recent` — le bloc « Récemment consultés » de l'accueil, pour un membre connecté (décision
   * 2026-11-27-listes-de-favoris) : son titre, l'écran de la liste entière et ses dernières offres ; `null` sans offre
   * consultée.
   */
  async recent(): Promise<HomeRecent | null> {
    return (await this.client.get<{ data: HomeRecent | null }>('/v1/wishlists/recent')).data;
  }

  /**
   * `POST /api/v1/offers/{id}/click` — une carte de l'accueil ou de la recherche touchée compte un clic ; pas pour son
   * propriétaire (décision 2026-11-25-compteurs-offres).
   */
  async click(id: string): Promise<void> {
    await this.client.post(`/v1/offers/${encodeURIComponent(id)}/click`);
  }

  /** `GET /api/v1/offers/{id}` — la fiche, ouverte sans connexion. */
  async get(id: string): Promise<OfferDetail> {
    return (await this.client.get<OfferDetailResponse>(`/v1/offers/${encodeURIComponent(id)}`)).data;
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
