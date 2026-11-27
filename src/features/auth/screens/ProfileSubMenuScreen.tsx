import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator } from 'react-native';

import { ProfileMenuLinks } from '../components/ProfileMenuLinks';
import { useProfileSubMenu } from '../hooks/useProfileSubMenu';
import { ProfileScreenShell } from './ProfileFormScreen';

/**
 * Un sous-menu du profil (`/profile/menu/[menu]`, décision 2026-11-27-menu-profil-icones-sous-menus) : son titre dans
 * l'en-tête, ses liens servis par l'API, chacun avec son icône ; rechargé à chaque retour (un libellé « Ajouter »
 * devient « Changer »).
 */
export function ProfileSubMenuScreen({ menu }: { menu: string }) {
  const submenu = useProfileSubMenu(menu);
  const { refetch } = submenu;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return (
    <ProfileScreenShell title={submenu.data?.title ?? ''}>
      {submenu.data === undefined ? <ActivityIndicator testID="profile-submenu-loading" /> : <ProfileMenuLinks items={submenu.data.data} />}
    </ProfileScreenShell>
  );
}
