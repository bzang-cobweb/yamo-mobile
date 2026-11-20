import type { FormValues } from '@/features/form/types';
import { filterParams } from '@/features/list/services/ListService';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { AppNotification, NotificationPage } from '../types';

/** Les notifications de l'app du compte connecté (`/api/v1/notifications`). */
export class NotificationService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * Une page, la plus récente en tête ; la première sans curseur ; restreinte à
   * `search` (nom de qui agit, titre du logement) et aux filtres choisis (décision
   * 2026-11-20-filtres-notifications).
   */
  async list(cursor: string | null = null, search = '', filters: FormValues = {}): Promise<NotificationPage> {
    const params = [
      cursor ? `cursor=${encodeURIComponent(cursor)}` : null,
      search.trim() ? `search=${encodeURIComponent(search.trim())}` : null,
      ...filterParams(filters),
    ].filter((param) => param !== null);
    const query = params.length > 0 ? `?${params.join('&')}` : '';

    return (await this.client.get<{ data: NotificationPage }>(`/v1/notifications${query}`)).data;
  }

  /** `GET /api/v1/notifications/{id}` — une de ses notifications, pour sa page. */
  async get(id: string): Promise<AppNotification> {
    return (await this.client.get<{ data: AppNotification }>(`/v1/notifications/${encodeURIComponent(id)}`)).data;
  }

  /** Le nombre de non lues : la pastille de l'onglet. */
  async unreadCount(): Promise<number> {
    return (await this.client.get<{ data: { unread: number } }>('/v1/notifications/unread-count')).data.unread;
  }

  async read(id: string): Promise<void> {
    await this.client.request<unknown>(`/v1/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
  }

  async readAll(): Promise<void> {
    await this.client.request<unknown>('/v1/notifications/read', { method: 'POST' });
  }
}

export const notificationService = new NotificationService();
