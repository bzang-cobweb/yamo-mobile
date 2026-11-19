// Route `/notifications/[id]` : la page d'une notification, ouverte depuis l'onglet
// « Notifications », par-dessus les onglets.
import { useLocalSearchParams } from 'expo-router';

import { NotificationDetailScreen } from '@/features/notification/screens/NotificationDetailScreen';

export default function NotificationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <NotificationDetailScreen id={String(id)} />;
}
