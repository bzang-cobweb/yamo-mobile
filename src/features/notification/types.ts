import type { FormFieldDefinition } from '@/features/form/types';
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
  /** Qui agit, lu à l'affichage : photo, nom, en ligne, sa page ; `null` (ancienne notification). */
  actor?: NotificationActor | null;
  /** Le texte sans le nom de qui agit, pour la carte ; `null` : `body`. */
  summary?: string | null;
  /** Le total de la demande (« 255 000 FCFA »), en gras sur la page ; `null` (ou absent) sans total. */
  total?: string | null;
  /** Message joint, saisi par un utilisateur (celui du membre, le motif d'un refus), ou `null`. */
  message: string | null;
  /** Écran de l'app à ouvrir (`/profile/lists/offer.bookings`), ou `null`. */
  link: string | null;
  /** Liens en plus, sous le texte (« Voir l'annonce » → `/offers/12`). */
  links: { label: string; link: string }[];
  /** Passages du texte qui ouvrent un écran (« Paul Etoa » → `/members/37`). */
  text_links: { text: string; link: string }[];
  /** Libellé du bouton qui ouvre `link` (« Réservations reçues ») ; `null` : un libellé générique. */
  link_label: string | null;
  read: boolean;
  created_at: string | null;
};

/** Qui agit dans une notification (décision 2026-11-19-page-membre). */
export type NotificationActor = {
  id: string;
  name: string;
  initials: string;
  photo: string | null;
  online: boolean;
  link: string;
  /** Sur la page d'une notification seulement : son e-mail et son téléphone (décision 2026-11-20-coordonnees-notification). */
  email?: string | null;
  phone?: string | null;
};

/** Une page de notifications, et les filtres de la liste (décision 2026-11-20-filtres-notifications). */
export type NotificationPage = { items: AppNotification[]; next_cursor: string | null; filters?: FormFieldDefinition[] };
