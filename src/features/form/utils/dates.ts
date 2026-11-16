/**
 * Dates seules (`AAAA-MM-JJ`), en heure locale : `new Date('AAAA-MM-JJ')` est lu en
 * UTC et `toISOString()` d'un minuit local donne la veille en Suisse.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

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

/** Date affichée dans la langue de l'app (« 12 avril 1990 », « April 12, 1990 »). */
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

/** Bornes du sélecteur : la plus ancienne date acceptée par l'API, et aujourd'hui. */
export const MIN_DATE = new Date(1900, 0, 1);
