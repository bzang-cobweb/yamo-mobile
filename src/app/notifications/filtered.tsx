// Route `/notifications/filtered` : les notifications ouvertes depuis une carte de « Mes logements »
// (un compteur, « Notifications »), déjà filtrées, par-dessus les onglets, avec un bouton retour
// (décision 2026-11-21-notifications-avec-retour). Les filtres sont ceux de l'onglet (`notifications`).
import { NotificationsScreen } from '@/features/notification/screens/NotificationsScreen';

export default function FilteredNotificationsRoute() {
  return <NotificationsScreen back />;
}
