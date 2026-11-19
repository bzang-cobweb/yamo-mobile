import { apiClient, type ApiClient } from '@/shared/api/ApiClient';

import type { AppNotification, NotificationPage } from '../types';

/** Les notifications de l'app du compte connecté (`/api/v1/notifications`). */
export class NotificationService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** Une page, la plus récente en tête ; la première sans curseur. */
  async list(cursor: string | null = null): Promise<NotificationPage> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';

    return (await this.client.get<{ data: NotificationPage }>(`/v1/notifications${query}`)).data;
  }

  /** Le nombre de non lues : la pastille de l'onglet. */
  /** `GET /api/v1/notifications/{id}` — une de ses notifications, pour sa page. */
  async get(id: string): Promise<AppNotification> {
    return (await this.client.get<{ data: AppNotification }>(`/v1/notifications/${encodeURIComponent(id)}`)).data;
  }

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
