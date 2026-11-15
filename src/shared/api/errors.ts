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

  /** 401 (jeton inconnu ou révoqué) ou 403 (refusé par la policy) : le jeton ne sert plus. */
  get rejectsToken(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/** Le serveur n'a pas répondu (réseau, URL, certificat). */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Network request failed', { cause });
    this.name = 'NetworkError';
  }
}
