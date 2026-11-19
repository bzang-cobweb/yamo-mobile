import type { Translate } from '@/shared/i18n/messages';

/**
 * « à l'instant », « il y a 5 min », « il y a 3 h », « hier », « il y a 4 jours »
 * (textes servis par Laravel, dans la langue de l'app) ; au-delà d'une semaine, la
 * date (« 3 mars 2027 »). Le moteur de l'app n'a pas `Intl.RelativeTimeFormat`.
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
  if (seconds < 86400) {
    return t('notifications.hoursAgo', { count: Math.floor(seconds / 3600) });
  }

  const days = Math.floor(seconds / 86400);

  if (days === 1) {
    return t('notifications.yesterday');
  }
  if (days < 7) {
    return t('notifications.daysAgo', { count: days });
  }

  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
