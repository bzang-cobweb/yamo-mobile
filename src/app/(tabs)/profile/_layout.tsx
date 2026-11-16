import { Stack } from 'expo-router';

/** Pile de l'onglet Profil : le profil, puis ses trois formulaires. */
export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
