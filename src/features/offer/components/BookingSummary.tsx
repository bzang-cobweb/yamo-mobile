import { SummaryLines } from '@/features/notification/components/SummaryLines';
import type { NotificationBooking } from '@/features/notification/types';

/**
 * Ce qui est propre à une demande sur la page d'une notification de son fil (décision 2026-11-26-booking-summary) : ses
 * lignes (coordonnées, dates, durée, prix, total en gras), par `SummaryLines`. Le nom du logement et son titre composé
 * ne sont pas ici : ils sont l'en-tête de la page (`heading`).
 */
export function BookingSummary({ booking, title, onOpen, testID = 'notification-detail' }: { booking: NotificationBooking; title?: string | null; onOpen: (link: string) => void; testID?: string }) {
  return <SummaryLines lines={booking.lines} title={title} onOpen={onOpen} testID={testID} />;
}
