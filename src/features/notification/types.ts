/**
 * Une notification de l'app (décision 2026-11-19-contrat-centre-notifications) :
 * titre et texte dans la langue du compte, l'écran à ouvrir, lue ou non.
 */
export type AppNotification = {
  id: string;
  title: string;
  body: string;
  /** Écran de l'app à ouvrir (`/profile/lists/offer.bookings`), ou `null`. */
  link: string | null;
  read: boolean;
  created_at: string | null;
};

export type NotificationPage = { items: AppNotification[]; next_cursor: string | null };
