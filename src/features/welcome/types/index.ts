/** Présentation de l'application (`ApplicationResource` du contrat `openapi.json`). */
export type Application = {
  /** Nom de l'application (`APP_NAME`). */
  name: string;
  /** Adresse du logo, ou `null` : afficher le nom à la place. */
  logo_url: string | null;
  /** Description dans la langue de la requête, ou `null`. */
  description: string | null;
};
