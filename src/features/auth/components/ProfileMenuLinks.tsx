import type { Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/theme/theme';

import type { ProfileMenuItem } from '../types';
import { ProfileMenuLink } from './ProfileMenuLink';

/**
 * Un lien sans nom de formulaire, de liste ni de sous-menu (réponse d'un serveur plus ancien, mise en cache, ou cible
 * inconnue) est ignoré au lieu de faire planter l'écran.
 */
function isName(name: unknown): name is string {
  return typeof name === 'string' && name !== '';
}

/** Route ouverte par un lien du menu : son formulaire, sa liste ou son sous-menu. */
export function menuHref({ form, list, menu }: ProfileMenuItem): Href | null {
  if (isName(form)) {
    return { pathname: '/profile/[form]', params: { form } };
  }

  if (isName(menu)) {
    return { pathname: '/profile/menu/[menu]', params: { menu } };
  }

  return isName(list) ? { pathname: '/profile/lists/[list]', params: { list } } : null;
}

/** Les liens d'un menu du profil, dans l'ordre servi, chacun avec son icône (décision 2026-11-27-menu-profil-icones-sous-menus). */
export function ProfileMenuLinks({ items }: { items: ProfileMenuItem[] }) {
  return (
    <View style={styles.links}>
      {items.map((item) => {
        const href = menuHref(item);

        return href === null ? null : <ProfileMenuLink key={item.key} href={href} label={item.label} icon={item.icon ?? null} testID={`profile-link-${item.key}`} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  links: { gap: Spacing.two },
});
