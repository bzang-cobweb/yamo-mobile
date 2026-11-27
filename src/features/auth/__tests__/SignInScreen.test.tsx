import { act, render, screen } from '@testing-library/react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { SignInScreen } from '../screens/SignInScreen';
import { loginService } from '../services/LoginService';
import { registerService } from '../services/RegisterService';

// Connexion sans mot de passe, l'inscription à la suite pour un identifiant inconnu
// (décision 2026-11-27-connexion-sans-mot-de-passe).
jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('../services/LoginService', () => ({ loginService: { login: jest.fn() } }));
jest.mock('../services/RegisterService', () => ({ registerService: { register: jest.fn() } }));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null, signIn: jest.fn(), t: (key: string) => key }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});

type FlowProps = { form: string; start: (values: Record<string, unknown>) => Promise<unknown> };
const flows: FlowProps[] = [];
jest.mock('../components/ChallengeFlow', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    ChallengeFlow: (props: FlowProps) => {
      flows.push(props);

      return <Text testID="challenge-flow">{props.form}</Text>;
    },
  };
});

const latest = () => flows[flows.length - 1];

async function show() {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <SignInScreen />
    </I18nContext.Provider>,
  );
}

describe('SignInScreen', () => {
  beforeEach(() => {
    flows.length = 0;
    jest.clearAllMocks();
  });

  it('identifiant connu : le code envoyé passe à l’étape du code, sans lien « Mot de passe oublié » ni « Créer un compte »', async () => {
    const challenge = { challenge: 'c1', channel: 'email', destination: 'a•••@b.ch' };
    jest.mocked(loginService.login).mockResolvedValue(challenge as never);
    await show();

    expect(screen.getByTestId('challenge-flow')).toHaveTextContent('auth.login');
    expect(screen.queryByTestId('sign-in-forgot')).toBeNull();
    expect(screen.queryByTestId('sign-in-register')).toBeNull();
    await expect(latest().start({ email: 'a@b.ch' })).resolves.toEqual(challenge);
  });

  it('identifiant inconnu : l’inscription s’ouvre et part avec l’identifiant saisi', async () => {
    jest.mocked(loginService.login).mockResolvedValue({ next: 'register', values: { phone: '791234567', phone_country: 'CH' } } as never);
    jest.mocked(registerService.register).mockResolvedValue({ challenge: 'c2', channel: 'sms', destination: '+41 ••• 67' });
    await show();

    let result: unknown;
    await act(async () => {
      result = await latest().start({ channel: 'phone', phone: '791234567', phone_country: 'CH' });
    });

    expect(result).toBeNull();
    expect(screen.getByTestId('challenge-flow')).toHaveTextContent('auth.register');
    expect(screen.getByTestId('sign-up-intro')).toHaveTextContent('auth.registerIntro');
    await latest().start({ name: 'awa', first_name: 'Awa', last_name: 'Diallo', phone: '' });
    expect(registerService.register).toHaveBeenCalledWith({ name: 'awa', first_name: 'Awa', last_name: 'Diallo', phone: '791234567', phone_country: 'CH' });
  });
});
