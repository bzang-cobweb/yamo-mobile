import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { DeleteAccountScreen } from '../screens/DeleteAccountScreen';
import { accountDeletionService } from '../services/AccountDeletionService';
import type { AuthContextValue } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
});
jest.mock('../services/AccountDeletionService', () => ({ accountDeletionService: { delete: jest.fn() } }));

const mockFormLoader = jest.fn();
jest.mock('@/features/form/components/FormLoader', () => ({
  FormLoader: (props: { name: string; destructive?: boolean; onSubmit: (values: Record<string, string>) => Promise<void> }) => {
    const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
    mockFormLoader(props);

    return <Pressable testID="submit" onPress={() => props.onSubmit({ current_password: 'secret' })} />;
  },
}));

const remove = accountDeletionService.delete as jest.Mock;

async function renderScreen(signOut = jest.fn().mockResolvedValue(undefined)) {
  const auth = { user: null, locale: 'fr', t: TEST_I18N.t, signOut } as unknown as AuthContextValue;
  await render(
    <AuthContext.Provider value={auth}>
      <DeleteAccountScreen />
    </AuthContext.Provider>,
  );

  return signOut;
}

describe('DeleteAccountScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it("affiche le formulaire de l'API avec un bouton rouge", async () => {
    await renderScreen();

    expect(mockFormLoader).toHaveBeenCalledWith(expect.objectContaining({ name: 'auth.profile.delete-account', destructive: true }));
  });

  it('supprime le compte, confirme et oublie la session', async () => {
    remove.mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    const signOut = await renderScreen();
    fireEvent.press(screen.getByTestId('submit'));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(remove).toHaveBeenCalledWith({ current_password: 'secret' });
    expect(alert).toHaveBeenCalledWith('Votre compte a été supprimé.');
  });
});
