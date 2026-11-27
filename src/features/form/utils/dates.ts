/**
 * Dates seules (`AAAA-MM-JJ`), en heure locale : `new Date('AAAA-MM-JJ')` est lu en
 * UTC et `toISOString()` d'un minuit local donne la veille en Suisse.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Une borne de date de `range` (`AAAA-MM-JJ`), ou `null` : sans borne, ou une borne qui n'est pas une date. */
export function dateBound(value: string | number | null | undefined): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** `AAAA-MM-JJ` → date à minuit heure locale, ou `null` si la valeur n'en est pas une. */
export function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Date → `AAAA-MM-JJ` selon le calendrier local. */
export function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Les formats des dates d'un champ date, servis par l'API avec le champ (`date_formats`, décision 2026-11-25-dates-formatees-serveur) : les changer côté
 * serveur suffit, sans nouvelle version de l'app. Ceux-ci ne servent que si l'API n'en sert pas.
 */
export type DateFormats = { value: Intl.DateTimeFormatOptions; month: Intl.DateTimeFormatOptions; weekday: Intl.DateTimeFormatOptions };

const DEFAULT_FORMATS: DateFormats = {
  value: { day: 'numeric', month: 'long', year: 'numeric' },
  month: { month: 'long', year: 'numeric' },
  weekday: { weekday: 'short' },
};

/** Les formats servis, complétés par ceux par défaut. */
export function dateFormats(served?: Partial<DateFormats> | null): DateFormats {
  return { ...DEFAULT_FORMATS, ...(served ?? {}) };
}

/** Une date au format `options` servi (la date choisie : « 12 avril 1990 »). */
export function formatDate(date: Date, locale: string, options: Intl.DateTimeFormatOptions = DEFAULT_FORMATS.value): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}
