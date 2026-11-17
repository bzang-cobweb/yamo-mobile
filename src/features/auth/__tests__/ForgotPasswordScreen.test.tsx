import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { FormValues } from '@/features/form/types';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { passwordResetService } from '../services/PasswordResetService';
import { verificationService } from '../services/VerificationService';
import type { AuthContextValue } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn(), back: jest.fn() } }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('../utils/device-name', () => ({ deviceName: () => 'iPhone' }));
jest.mock('../services/VerificationService', () => ({ verificationService: { verify: jest.fn(), resend: jest.fn() } }));
jest.mock('../services/PasswordResetService', () => ({ passwordResetService: { forgot: jest.fn(), reset: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
});

/** Chaque formulaire de l'API est remplacé par un bouton qui envoie des valeurs fixes. */
jest.mock('@/features/form/components/FormLoader', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const values: Record<string, FormValues> = {
    'auth.password.forgot': { channel: 'email', email: 'jeanne@example.com' },
    'auth.code': { code: '123456' },
    'auth.password.reset': { password: 'New-password-42', password_confirmation: 'New-password-42' },
  };

  return {
    FormLoader: ({ name, onSubmit }: { name: string; onSubmit: (values: FormValues) => Promise<void> }) => (
      <Pressable testID={`submit-${name}`} onPress={() => onSubmit(values[name]).catch(() => undefined)}>
        <Text>{name}</Text>
      </Pressable>
    ),
  };
});

describe('ForgotPasswordScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('identifiant, code, nouveau mot de passe, puis retour à la connexion avec la confirmation', async () => {
    jest.mocked(passwordResetService.forgot).mockResolvedValue({ challenge: 'abc', channel: 'email', destination: 'j•••@example.com' });
    jest.mocked(verificationService.verify).mockResolvedValue({ kind: 'password', challenge: 'abc' });
    jest.mocked(passwordResetService.reset).mockResolvedValue(undefined);

    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <AuthContext.Provider value={{ t: TEST_I18N.t } as AuthContextValue}>
          <ForgotPasswordScreen />
        </AuthContext.Provider>
      </I18nContext.Provider>,
    );

    expect(screen.getByTestId('back-header-title')).toHaveTextContent('Mot de passe oublié');

    await fireEvent.press(screen.getByTestId('submit-auth.password.forgot'));
    expect(passwordResetService.forgot).toHaveBeenCalledWith({ channel: 'email', email: 'jeanne@example.com' });

    // Dans l'étape de code, la flèche de l'en-tête revient au formulaire, puis à l'écran précédent.
    await fireEvent.press(screen.getByTestId('back-header-link'));
    expect(screen.queryByTestId('submit-auth.code')).toBeNull();
    await fireEvent.press(screen.getByTestId('back-header-link'));
    expect(router.back).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('submit-auth.password.forgot'));
    await fireEvent.press(screen.getByTestId('submit-auth.code'));
    await waitFor(() => expect(screen.getByTestId('submit-auth.password.reset')).toBeOnTheScreen());

    await fireEvent.press(screen.getByTestId('submit-auth.password.reset'));

    expect(passwordResetService.reset).toHaveBeenCalledWith('abc', { password: 'New-password-42', password_confirmation: 'New-password-42' });
    expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/sign-in', params: { notice: 'passwordReset' } });
  });
});
