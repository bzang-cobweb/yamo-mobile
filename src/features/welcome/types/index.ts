/** Présentation de l'application (`ApplicationResource` du contrat `openapi.json`). */
export type Application = {
  /** Nom de l'application (`APP_NAME`). */
  name: string;
  /** Description dans la langue de la requête, ou `null`. */
  description: string | null;
  /** Canaux de compte de l'application : au moins un est actif. */
  channels: { email: boolean; phone: boolean };
};
