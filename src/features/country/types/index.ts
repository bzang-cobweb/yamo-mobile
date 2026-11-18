/** Un pays ouvert, proposé à l'entrée de l'app (`GET /api/v1/countries`). */
export type Country = {
  code: string;
  name: string;
  native_name: string;
  /** Drapeau en emoji. */
  flag: string;
  /** Devise (ISO 4217). */
  currency: string | null;
  dial_code: string;
};

export type CountriesResponse = { data: Country[] };
