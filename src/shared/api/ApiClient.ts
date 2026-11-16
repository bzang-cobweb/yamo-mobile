import { API_URL } from '@/shared/config';

import { ApiError, NetworkError } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  /** Envoyé en JSON, sauf un `FormData`, envoyé tel quel (multipart). */
  body?: unknown;
};

/**
 * Client HTTP de l'API Laravel : URL de base, en-têtes, jeton, langue, erreurs.
 * Les services des features le reçoivent et n'écrivent qu'une méthode par
 * appel API. Le jeton et la langue sont fixés par le fournisseur d'authentification.
 */
export class ApiClient {
  private token: string | null = null;
  private locale: string | null = null;

  constructor(private readonly baseUrl: string) {}

  setToken(token: string | null): void {
    this.token = token;
  }

  setLocale(locale: string): void {
    this.locale = locale;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body });
  }

  /**
   * Envoi multipart (fichiers). `fetch` pose lui-même l'en-tête `Content-Type` et
   * sa frontière : ne jamais le forcer.
   */
  postForm<T>(path: string, form: FormData): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: form });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
    const isForm = body instanceof FormData;
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(this.locale && { 'Accept-Language': this.locale }),
          ...(body !== undefined && !isForm && { 'Content-Type': 'application/json' }),
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      });
    } catch (error) {
      throw new NetworkError(error);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(response.status, payload.message ?? response.statusText, payload.errors);
    }

    return payload as T;
  }
}

/** Le client de l'application, partagé par tous les services. */
export const apiClient = new ApiClient(API_URL);
