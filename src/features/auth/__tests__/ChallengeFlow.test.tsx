import { fireEvent, render, screen } from '@testing-library/react-native';

import type { FormValues } from '@/features/form/types';
import { ApiError } from '@/shared/api/errors';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { ChallengeFlow } from '../components/ChallengeFlow';
import { verificationService } from '../services/VerificationService';
import type { Challenge } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('../utils/device-name', () => ({ deviceName: () => 'iPhone' }));
jest.mock('../services/VerificationService', () => ({
  verificationService: { verify: jest.fn(), resend: jest.fn() },
}));

/** Chaque formulaire de l'API est remplacé par un bouton qui envoie des valeurs fixes. */
jest.mock('@/features/form/components/FormLoader', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    FormLoader: ({ name, onSubmit }: { name: string; onSubmit: (values: FormValues) => Promise<void> }) => (
      <Pressable testID={`submit-${name}`} onPress={() => onSubmit(name === 'auth.code' ? { code: '123456' } : { channel: 'email', email: 'a@b.c' }).catch(() => undefined)}>
        <Text>{name}</Text>
      </Pressable>
    ),
  };
});

const email: Challenge = { challenge: 'abc', channel: 'email', destination: 'j•••@example.com' };
const sms: Challenge = { challenge: 'abc', channel: 'sms', destination: '+41 ••• 67' };

async function renderFlow(onVerified = jest.fn().mockResolvedValue(undefined)) {
  const start = jest.fn().mockResolvedValue(email);
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <ChallengeFlow form="auth.login" start={start} onVerified={onVerified} />
    </I18nContext.Provider>,
  );

  return { start, onVerified };
}

describe('ChallengeFlow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('affiche le formulaire, puis le code envoyé, et ouvre la session une fois le code validé', async () => {
    const session = { user: { id: 1 }, token: 't' };
    jest.mocked(verificationService.verify).mockResolvedValue({ kind: 'session', session } as never);
    const { start, onVerified } = await renderFlow();

    expect(screen.queryByTestId('submit-auth.code')).toBeNull();
    await fireEvent.press(screen.getByTestId('submit-auth.login'));

    expect(start).toHaveBeenCalledWith({ channel: 'email', email: 'a@b.c' });
    expect(screen.getByTestId('code-sent')).toHaveTextContent('Code envoyé à j•••@example.com.');
    expect(onVerified).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('submit-auth.code'));

    expect(verificationService.verify).toHaveBeenCalledWith(email, '123456', 'iPhone');
    expect(onVerified).toHaveBeenCalledWith({ kind: 'session', session });
  });

  it('un autre code attendu : affiche sa destination, sans rien ouvrir', async () => {
    jest.mocked(verificationService.verify).mockResolvedValueOnce({ kind: 'pending', challenge: sms });
    const { onVerified } = await renderFlow();

    await fireEvent.press(screen.getByTestId('submit-auth.login'));
    await fireEvent.press(screen.getByTestId('submit-auth.code'));

    expect(screen.getByTestId('code-sent')).toHaveTextContent('Code envoyé à +41 ••• 67.');
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('code refusé : reste sur le code, rien n’est ouvert', async () => {
    jest.mocked(verificationService.verify).mockRejectedValue(new ApiError(422, 'faux', { code: ['Code incorrect.'] }));
    const { onVerified } = await renderFlow();

    await fireEvent.press(screen.getByTestId('submit-auth.login'));
    await fireEvent.press(screen.getByTestId('submit-auth.code'));

    expect(screen.getByTestId('submit-auth.code')).toBeTruthy();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('renvoi : confirme, ou affiche le refus de l’API', async () => {
    await renderFlow();
    await fireEvent.press(screen.getByTestId('submit-auth.login'));

    jest.mocked(verificationService.resend).mockResolvedValueOnce(undefined);
    await fireEvent.press(screen.getByTestId('code-resend'));
    expect(verificationService.resend).toHaveBeenCalledWith(email);
    expect(screen.getByTestId('code-notice')).toHaveTextContent('Nouveau code envoyé.');

    jest.mocked(verificationService.resend).mockRejectedValueOnce(new ApiError(422, 'tôt', { code: ['Attendez une minute.'] }));
    await fireEvent.press(screen.getByTestId('code-resend'));
    expect(screen.getByTestId('code-notice')).toHaveTextContent('Attendez une minute.');
  });

  it('retour : revient au premier formulaire', async () => {
    await renderFlow();
    await fireEvent.press(screen.getByTestId('submit-auth.login'));
    await fireEvent.press(screen.getByTestId('code-back'));

    expect(screen.getByTestId('submit-auth.login')).toBeTruthy();
  });
});
