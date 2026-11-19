import type { StatusTagValue } from '@/shared/components/StatusTag';

/**
 * Une notification de l'app (décision 2026-11-19-contrat-centre-notifications) :
 * titre et texte dans la langue du compte, l'écran à ouvrir, lue ou non.
 */
export type AppNotification = {
  id: string;
  title: string;
  /** Statut en pastille sous le titre (« En attente », ton `warning`), ou `null`. */
  tag: StatusTagValue | null;
  body: string;
  /** Écran de l'app à ouvrir (`/profile/lists/offer.bookings`), ou `null`. */
  link: string | null;
  /** Liens en plus, sous le texte (« Voir l'annonce » → `/offers/12`). */
  links: { label: string; link: string }[];
  read: boolean;
  created_at: string | null;
};

export type NotificationPage = { items: AppNotification[]; next_cursor: string | null };
