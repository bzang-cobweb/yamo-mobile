import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { RestoreAccountPrompt } from '../components/RestoreAccountPrompt';
import { AuthContext } from '../context/AuthContext';
import { accountRestoreService } from '../services/AccountRestoreService';
import type { AuthContextValue } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('../services/AccountRestoreService', () => ({ accountRestoreService: { restore: jest.fn() } }));
jest.mock('../utils/device-name', () => ({ deviceName: () => 'iPhone' }));

const restore = accountRestoreService.restore as jest.Mock;

async function renderPrompt(onCancel = jest.fn(), signIn = jest.fn().mockResolvedValue(undefined)) {
  const auth = { user: null, locale: 'fr', t: TEST_I18N.t, signIn } as unknown as AuthContextValue;
  await render(
    <AuthContext.Provider value={auth}>
      <RestoreAccountPrompt challenge="abc" deletionDate="2026-12-20" onCancel={onCancel} />
    </AuthContext.Provider>,
  );

  return { onCancel, signIn };
}

describe('RestoreAccountPrompt', () => {
  beforeEach(() => jest.clearAllMocks());

  it('annonce la date de la suppression définitive', async () => {
    await renderPrompt();

    expect(screen.getByTestId('restore-account-message')).toHaveTextContent(/20 décembre 2026/);
  });

  it('récupère le compte, le confirme et ouvre la session', async () => {
    const session = { user: { id: 1 }, token: 't' };
    restore.mockResolvedValue(session);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    const { signIn } = await renderPrompt();
    await fireEvent.press(screen.getByTestId('restore-account-confirm'));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith(session));
    expect(restore).toHaveBeenCalledWith('abc', 'iPhone');
    expect(alert).toHaveBeenCalledWith('Votre compte a été récupéré.');
  });

  it("affiche l'erreur de l'API et laisse réessayer", async () => {
    restore.mockRejectedValue(new ApiError(422, 'invalide', { code: ['Code expiré.'] }));

    const { signIn } = await renderPrompt();
    await fireEvent.press(screen.getByTestId('restore-account-confirm'));

    expect(await screen.findByTestId('restore-account-error')).toHaveTextContent('Code expiré.');
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByTestId('restore-account-confirm')).not.toBeDisabled();
  });

  it('« Annuler » laisse le compte en attente de suppression', async () => {
    const { onCancel } = await renderPrompt();
    await fireEvent.press(screen.getByTestId('restore-account-cancel'));

    expect(onCancel).toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
  });
});
