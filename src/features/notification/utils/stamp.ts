/**
 * La date d'une notification ou d'une étape (décision 2026-11-20-suivi-conversation) :
 * l'heure seule le jour même (« 14:05 »), sinon la date et l'heure, au format
 * `dateStyle` (« 15 nov. 2026 à 05:24 »).
 */
export function formatStamp(iso: string, locale: string, dateStyle: 'medium' | 'full' = 'medium', now: Date = new Date()): string {
  const date = new Date(iso);
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();

  return new Intl.DateTimeFormat(locale, sameDay ? { timeStyle: 'short' } : { dateStyle, timeStyle: 'short' }).format(date);
}
