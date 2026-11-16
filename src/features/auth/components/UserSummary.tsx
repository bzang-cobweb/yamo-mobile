import { ThemedText } from '@/shared/theme/components/themed-text';

import { useAuth } from '../hooks/useAuth';
import type { User } from '../types';
import { Avatar } from './Avatar';

/** Photo, pseudonyme, nom complet et e-mail de l'utilisateur connecté. */
export function UserSummary({ user }: { user: User }) {
  const { t } = useAuth();

  return (
    <>
      <Avatar user={user} />
      <ThemedText type="subtitle">{t('home.greeting', { name: user.name })}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {t('home.signedInAs', { fullName: `${user.first_name} ${user.last_name}`.trim() })}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{t('home.email', { email: user.email })}</ThemedText>
    </>
  );
}
