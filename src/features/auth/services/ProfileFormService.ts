import type { FormSubmit, FormValues } from '@/features/form/types';
import { apiClient, type ApiClient } from '@/shared/api/ApiClient';
import { isApiPath } from '@/shared/api/paths';

import type { Challenge, User } from '../types';

/** Méthodes qu'un formulaire du profil peut demander. */
const METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'] as const;

/** Suites au succès que l'app sait exécuter. */
const ACTIONS = ['profile', 'sign-out', 'back'] as const;


/**
 * Envoi d'un formulaire du profil, ou du retrait d'un item d'une liste, tel que
 * l'API le décrit et que l'app sait l'exécuter.
 */
export type ProfileSubmission = {
  method: (typeof METHODS)[number];
  endpoint: string;
  success: { action: (typeof ACTIONS)[number]; message: string };
};

/** Ce que l'API a répondu à l'envoi. */
export type ProfileSubmitResult =
  /** Un code est envoyé ; l'opération n'est enregistrée qu'une fois le code validé. */
  | { kind: 'challenge'; challenge: Challenge }
  /** Le compte modifié. */
  | { kind: 'user'; user: User }
  /** Rien à mettre à jour (réponse vide). */
  | { kind: 'none' };

/**
 * L'envoi décrit par `submit`, ou `null` s'il manque ou si l'app ne sait pas
 * l'exécuter (méthode, point d'API ou suite inconnus) : rien n'est alors envoyé.
 */
export function profileSubmission(submit: Omit<FormSubmit, 'label'> & { label?: string }): ProfileSubmission | null {
  const { method, endpoint, success } = submit;

  if (
    !METHODS.includes(method as ProfileSubmission['method']) ||
    !isApiPath(endpoint) ||
    !ACTIONS.includes(success?.action as ProfileSubmission['success']['action']) ||
    typeof success?.message !== 'string'
  ) {
    return null;
  }

  return { method, endpoint, success } as ProfileSubmission;
}

function isChallenge(response: unknown): response is Challenge {
  const value = response as Partial<Challenge> | null;

  return typeof value?.challenge === 'string' && typeof value.channel === 'string' && typeof value.destination === 'string';
}

function isUserResponse(response: unknown): response is { data: User } {
  const data = (response as { data?: Partial<User> } | null)?.data;

  return typeof data === 'object' && data !== null && typeof data.id === 'number';
}

/**
 * Formulaires du profil, que l'app envoie sans les connaître d'avance : la
 * méthode et le point d'API viennent de la définition du formulaire
 * (décision 2026-11-17-formulaires-profil-generiques).
 */
export class ProfileFormService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** `<method> /api<endpoint>` avec les valeurs du formulaire et le jeton de la session. */
  async submit(submission: ProfileSubmission, values: FormValues): Promise<ProfileSubmitResult> {
    const response = await this.client.request<unknown>(submission.endpoint, { method: submission.method, body: values });

    if (isChallenge(response)) {
      return { kind: 'challenge', challenge: response };
    }

    return isUserResponse(response) ? { kind: 'user', user: response.data } : { kind: 'none' };
  }
}

export const profileFormService = new ProfileFormService();
