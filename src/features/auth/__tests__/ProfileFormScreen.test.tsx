import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { FormValues } from '@/features/form/types';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { ProfileFormScreen } from '../screens/ProfileFormScreen';
import type { AuthContextValue } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn(), back: jest.fn() } }));

/** Le formulaire de l'API est remplacé par un bouton qui envoie des valeurs fixes. */
jest.mock('@/features/form/components/FormLoader', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    FormLoader: ({ onSubmit }: { onSubmit: (values: FormValues) => Promise<void> }) => (
      <Pressable testID="fake-submit" onPress={() => onSubmit({ first_name: 'Jeanne' }).catch(() => undefined)}>
        <Text>envoyer</Text>
      </Pressable>
    ),
  };
});

async function renderScreen(onSubmit: (values: FormValues) => Promise<void>, notice: 'saved' | 'password') {
  await render(
    <AuthContext.Provider value={{ t: TEST_I18N.t } as AuthContextValue}>
      <ProfileFormScreen title="Informations personnelles" form="auth.profile.personal" notice={notice} onSubmit={onSubmit} />
    </AuthContext.Provider>,
  );
}

describe('ProfileFormScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enregistré : envoie par le service puis revient au profil avec la confirmation', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await renderScreen(onSubmit, 'password');

    await fireEvent.press(screen.getByTestId('fake-submit'));

    expect(onSubmit).toHaveBeenCalledWith({ first_name: 'Jeanne' });
    expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/profile', params: { notice: 'password' } });
  });

  it('refusé par l’API : reste sur le formulaire (l’erreur y est affichée)', async () => {
    await renderScreen(jest.fn().mockRejectedValue(new Error('422')), 'saved');

    await fireEvent.press(screen.getByTestId('fake-submit'));

    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});
