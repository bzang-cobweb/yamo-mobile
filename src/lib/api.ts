import { API_URL } from '@/config';
import type { Locale } from '@/i18n';

/**
 * Client de l'API Laravel. Les formes de réponse suivent le contrat
 * `openapi.json` du dépôt web (`UserResource`).
 */

export type User = {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  locale: Locale;
};

type LoginResponse = { data: User; token: string };
type UserResponse = { data: User };

/** Erreur renvoyée par l'API, avec son statut et ses erreurs de validation (422). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Le serveur n'a pas répondu (réseau, URL, certificat). */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Network request failed', { cause });
    this.name = 'NetworkError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  token?: string | null;
  locale: Locale;
  body?: unknown;
};

async function request<T>(path: string, { method = 'GET', token, locale, body }: RequestOptions): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Accept-Language': locale,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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

export function login(credentials: { email: string; password: string; deviceName: string }, locale: Locale) {
  return request<LoginResponse>('/v1/auth/login', {
    method: 'POST',
    locale,
    body: { email: credentials.email, password: credentials.password, device_name: credentials.deviceName },
  });
}

export function logout(token: string, locale: Locale) {
  return request<void>('/v1/auth/logout', { method: 'POST', token, locale });
}

export async function me(token: string, locale: Locale): Promise<User> {
  return (await request<UserResponse>('/v1/auth/me', { token, locale })).data;
}
