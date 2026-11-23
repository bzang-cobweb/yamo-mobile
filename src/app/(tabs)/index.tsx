// Route `/` (onglet Accueil, écran par défaut) : vide pour l'instant, les offres sont passées dans l'onglet
// « Recherche » (décision 2026-11-23-onglet-recherche).
import { ThemedView } from '@/shared/theme/components/themed-view';

export default function HomeScreen() {
  return <ThemedView testID="home-screen" style={{ flex: 1 }} />;
}
