import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import type { FormDefinition, FormValues } from '@/features/form/types';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { ProfileFormScreen } from '../screens/ProfileFormScreen';
import { verificationService } from '../services/VerificationService';
import type { AuthContextValue } from '../types';
import { takeProfileNotice } from '../utils/profile-notice';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn(), back: jest.fn(), canGoBack: () => true } , useRootNavigationState: () => undefined, useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});

const mockRequest = jest.fn();
jest.mock('@/shared/api/ApiClient', () => ({ apiClient: { request: (...args: unknown[]) => mockRequest(...args) } }));
jest.mock('../services/VerificationService', () => ({ verificationService: { verify: jest.fn(), resend: jest.fn() } }));

let mockDefinition: FormDefinition;
const mockUseFormDefinition = jest.fn();
jest.mock('@/features/form/hooks/useFormDefinition', () => ({
  useFormDefinition: (...args: unknown[]) => {
    mockUseFormDefinition(...args);

    return { data: mockDefinition, isPending: false, isError: false };
  },
}));

/** Chaque formulaire de l'API est remplacé par un bouton qui envoie des valeurs fixes. */
jest.mock('@/features/form/components/FormLoader', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    FormLoader: ({ name, record, onSubmit }: { name: string; record?: string; onSubmit: (values: FormValues) => Promise<void> }) => (
      <Pressable testID={`submit-${name}`} accessibilityHint={record} onPress={() => onSubmit(name === 'auth.code' ? { code: '123456' } : { enabled: true }).catch(() => undefined)}>
        <Text>{name}</Text>
      </Pressable>
    ),
  };
});

/** Un formulaire que l'app ne connaît pas : tout vient de sa définition. */
function definition(submit: Partial<FormDefinition['submit']> = {}): FormDefinition {
  return {
    name: 'notifications.settings',
    title: 'Notifications',
    subtitle: null,
    fields: [],
    submit: { label: 'Enregistrer', method: 'PATCH', endpoint: '/v1/notifications', success: { action: 'profile', message: 'Notifications enregistrées.' }, ...submit },
  };
}

const user = { id: 1, full_name: 'Jeanne Dupont', locale: 'en' };

async function renderScreen(record?: string) {
  const auth = { t: TEST_I18N.t, setUser: jest.fn(), signOut: jest.fn().mockResolvedValue(undefined) };
  await render(
    <AuthContext.Provider value={auth as unknown as AuthContextValue}>
      <ProfileFormScreen form="notifications.settings" record={record} />
    </AuthContext.Provider>,
  );

  return auth;
}

describe('ProfileFormScreen (tout formulaire du profil, sans le connaître d’avance)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    takeProfileNotice();
    mockDefinition = definition();
  });

  it('affiche le titre servi par l’API dans l’en-tête, envoie au point d’API décrit et revient au profil avec le message', async () => {
    mockRequest.mockResolvedValue(undefined);
    const auth = await renderScreen();

    expect(screen.getByText('Notifications')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('submit-notifications.settings'));

    expect(mockRequest).toHaveBeenCalledWith('/v1/notifications', { method: 'PATCH', body: { enabled: true } });
    expect(auth.setUser).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledWith('/profile');
    expect(takeProfileNotice()).toBe('Notifications enregistrées.');
  });

  it('le compte renvoyé est mis à jour dans l’app (langue comprise)', async () => {
    mockRequest.mockResolvedValue({ data: user });
    const auth = await renderScreen();

    await fireEvent.press(screen.getByTestId('submit-notifications.settings'));

    expect(auth.setUser).toHaveBeenCalledWith(user);
    expect(router.dismissTo).toHaveBeenCalledWith('/profile');
  });

  it('un code demandé : étape du code, puis compte mis à jour et retour au profil', async () => {
    const challenge = { challenge: 'abc', channel: 'email', destination: 'j•••@example.com' };
    mockRequest.mockResolvedValue(challenge);
    (verificationService.verify as jest.Mock).mockResolvedValue({ kind: 'user', user });
    const auth = await renderScreen();

    await fireEvent.press(screen.getByTestId('submit-notifications.settings'));

    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(screen.getByTestId('code-sent')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('submit-auth.code'));

    expect(verificationService.verify).toHaveBeenCalledWith(challenge, '123456', expect.any(String));
    expect(auth.setUser).toHaveBeenCalledWith(user);
    expect(takeProfileNotice()).toBe('Notifications enregistrées.');
  });

  it('suite « sign-out » : message, puis déconnexion', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockDefinition = definition({ method: 'DELETE', endpoint: '/v1/auth/me', destructive: true, success: { action: 'sign-out', message: 'Votre compte a été supprimé.' } });
    mockRequest.mockResolvedValue(undefined);
    const auth = await renderScreen();

    await fireEvent.press(screen.getByTestId('submit-notifications.settings'));

    expect(mockRequest).toHaveBeenCalledWith('/v1/auth/me', { method: 'DELETE', body: { enabled: true } });
    expect(alert).toHaveBeenCalledWith('Votre compte a été supprimé.');
    expect(auth.signOut).toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('ouvert depuis un item d’une liste : formulaire lié à l’enregistrement, puis retour à la liste avec le message', async () => {
    mockDefinition = definition({ method: 'PATCH', endpoint: '/v1/auth/me/addresses/12', success: { action: 'back', message: 'Adresse enregistrée.' } });
    mockRequest.mockResolvedValue(undefined);
    await renderScreen('12');

    expect(mockUseFormDefinition).toHaveBeenCalledWith('notifications.settings', '12');
    expect(screen.getByTestId('submit-notifications.settings').props.accessibilityHint).toBe('12');
    await fireEvent.press(screen.getByTestId('submit-notifications.settings'));

    expect(mockRequest).toHaveBeenCalledWith('/v1/auth/me/addresses/12', { method: 'PATCH', body: { enabled: true } });
    expect(router.back).toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(takeProfileNotice()).toBe('Adresse enregistrée.');
  });

  it('refusé par l’API : reste sur le formulaire (l’erreur y est affichée)', async () => {
    mockRequest.mockRejectedValue(new Error('422'));
    await renderScreen();

    await fireEvent.press(screen.getByTestId('submit-notifications.settings'));

    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it.each([
    ['sans envoi décrit', { method: undefined, endpoint: undefined, success: undefined }],
    ['vers une autre adresse', { endpoint: 'https://example.test/v1/notifications' }],
  ])('%s : une erreur, et rien n’est envoyé', async (_name, submit) => {
    mockDefinition = definition(submit);
    await renderScreen();

    expect(screen.getByTestId('profile-form-unsupported')).toBeTruthy();
    expect(screen.queryByTestId('submit-notifications.settings')).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
