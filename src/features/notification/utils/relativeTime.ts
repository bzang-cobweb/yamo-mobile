import type { Translate } from '@/shared/i18n/messages';

/**
 * La date d'une carte, comme dans une messagerie (décision 2026-11-22-date-carte-heure-hier) :
 * - aujourd'hui : l'heure, au format de la langue (« 10:30 ») ;
 * - hier : « hier » (texte servi par Laravel) ;
 * - de 2 à 6 jours : « il y a 4 jours » ;
 * - au-delà : la date entière en chiffres, au format de la langue (« 03/03/2027 », « 03.03.2027 »,
 *   décision 2026-11-22-date-entiere-chiffres).
 *
 * Les jours se comptent au calendrier (minuit), pas par tranches de 24 h. Le moteur de l'app n'a pas
 * `Intl.RelativeTimeFormat`.
 */
export function relativeTime(iso: string | null, t: Translate, locale: string, now: Date = new Date()): string {
  if (iso === null) {
    return '';
  }

  const date = new Date(iso);
  const midnight = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.max(0, Math.round((midnight(now) - midnight(date)) / 86_400_000));

  if (days === 0) {
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  if (days === 1) {
    return t('notifications.yesterday');
  }
  if (days < 7) {
    return t('notifications.daysAgo', { count: days });
  }

  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}
