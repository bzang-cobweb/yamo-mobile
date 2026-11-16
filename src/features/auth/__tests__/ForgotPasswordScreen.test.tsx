import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { FormValues } from '@/features/form/types';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { passwordResetService } from '../services/PasswordResetService';
import { verificationService } from '../services/VerificationService';
import type { AuthContextValue } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn(), back: jest.fn() } }));
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
    'auth.password.forgot': { identifier: 'jeanne@example.com' },
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
      <AuthContext.Provider value={{ t: TEST_I18N.t } as AuthContextValue}>
        <ForgotPasswordScreen />
      </AuthContext.Provider>,
    );

    expect(screen.getByTestId('back-header-link')).toHaveTextContent('← Se connecter');

    await fireEvent.press(screen.getByTestId('submit-auth.password.forgot'));
    expect(passwordResetService.forgot).toHaveBeenCalledWith({ identifier: 'jeanne@example.com' });

    await fireEvent.press(screen.getByTestId('submit-auth.code'));
    await waitFor(() => expect(screen.getByTestId('submit-auth.password.reset')).toBeOnTheScreen());

    await fireEvent.press(screen.getByTestId('submit-auth.password.reset'));

    expect(passwordResetService.reset).toHaveBeenCalledWith('abc', { password: 'New-password-42', password_confirmation: 'New-password-42' });
    expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/sign-in', params: { notice: 'passwordReset' } });
  });
});
