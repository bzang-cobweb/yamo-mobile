import { apiClient, type ApiClient } from '@/shared/api/ApiClient';
import type { Messages } from '@/shared/i18n/messages';

export type MessagesResponse = { data: { locale: string; messages: Messages } };

/** Textes de l'interface servis par l'API. Une méthode par appel. */
export class MessageService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `GET /api/v1/messages` — public ; dans la langue du compte, sinon `Accept-Language`. */
  async get(): Promise<MessagesResponse['data']> {
    return (await this.client.get<MessagesResponse>('/v1/messages')).data;
  }
}

export const messageService = new MessageService();
