import type { Translate } from '@/shared/i18n/messages';

/**
 * La date d'une carte (décision 2026-11-22-date-carte-heure) :
 * - moins d'une minute : « à l'instant » ; moins d'une heure : « il y a 5 min » (textes servis par Laravel) ;
 * - plus tard aujourd'hui : l'heure, au format de la langue (« 10:30 ») ;
 * - hier : « hier 10:30 » ;
 * - avant : la date entière en chiffres et l'heure, au format de la langue (« 03/03/2027 10:30 », décision
 *   2026-11-22-date-entiere-chiffres).
 *
 * Les jours se comptent au calendrier (minuit), pas par tranches de 24 h. Le moteur de l'app n'a pas
 * `Intl.RelativeTimeFormat`.
 */
export function relativeTime(iso: string | null, t: Translate, locale: string, now: Date = new Date()): string {
  if (iso === null) {
    return '';
  }

  const date = new Date(iso);
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));

  if (seconds < 60) {
    return t('notifications.justNow');
  }
  if (seconds < 3600) {
    return t('notifications.minutesAgo', { count: Math.floor(seconds / 60) });
  }

  const midnight = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.max(0, Math.round((midnight(now) - midnight(date)) / 86_400_000));
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);

  if (days === 0) {
    return time;
  }
  if (days === 1) {
    return `${t('notifications.yesterday')} ${time}`;
  }

  return `${new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)} ${time}`;
}
