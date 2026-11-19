import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { offerService } from '../services/OfferService';

/** Un mois du calendrier d'une offre ; `null` : le mois courant (décision 2026-11-19-contrat-calendrier-offre). */
export function useOfferCalendar(id: string, month: string | null) {
  const { locale } = useI18n();

  return useQuery({
    queryKey: ['offer-calendar', id, month, locale],
    queryFn: () => offerService.calendar(id, month),
    placeholderData: (previous) => previous,
  });
}

/** Le panneau d'un jour ; rien tant qu'aucun jour n'est choisi. */
export function useOfferCalendarDay(id: string, date: string | null) {
  const { locale } = useI18n();

  return useQuery({
    queryKey: ['offer-calendar-day', id, date, locale],
    queryFn: () => offerService.calendarDay(id, String(date)),
    enabled: date !== null,
  });
}
