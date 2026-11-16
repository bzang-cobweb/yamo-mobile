import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AvatarPicker } from '../components/AvatarPicker';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue, AvatarFile, User } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const jeanne: User = {
  id: 1,
  name: 'jeanne',
  first_name: 'Jeanne',
  last_name: 'Dupont',
  full_name: 'Jeanne Dupont',
  initials: 'JD',
  gender: 'female',
  birth_date: null,
  country: null,
  region: null,
  email: 'jeanne@example.com',
  phone: null,
  phone_country: null,
  last_seen_at: null,
  is_online: true,
  locale: 'fr',
  avatar_url: null,
};

const file: AvatarFile = { name: 'avatar.jpg', type: 'image/jpeg', base64: '/9j/4AAQ' };

async function renderPicker(user: User, overrides: Partial<Parameters<typeof AvatarPicker>[0]> = {}) {
  const setUser = jest.fn();
  const service = { uploadAvatar: jest.fn(), removeAvatar: jest.fn() };
  const pick = jest.fn().mockResolvedValue(file);
  const auth = {
    isLoading: false,
    offline: false,
    isRetrying: false,
    retry: jest.fn(),
    user,
    locale: 'fr',
    t: TEST_I18N.t,
    signIn: jest.fn(),
    signOut: jest.fn(),
    setUser,
  } as AuthContextValue;

  await render(
    <AuthContext.Provider value={auth}>
      <AvatarPicker service={service} pick={pick} {...overrides} />
    </AuthContext.Provider>,
  );

  return { setUser, service, pick };
}

/** Ouvre le menu de la photo et renvoie ses boutons. */
async function openMenu(): Promise<AlertButton[]> {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await fireEvent.press(screen.getByTestId('avatar-picker'));
  const buttons = alert.mock.calls.at(-1)?.[2] ?? [];
  alert.mockRestore();

  return buttons;
}

function button(buttons: AlertButton[], text: string): AlertButton {
  const found = buttons.find((candidate) => candidate.text === text);
  expect(found).toBeDefined();

  return found as AlertButton;
}

describe('AvatarPicker', () => {
  it('affiche les initiales sans photo, et propose seulement de choisir', async () => {
    await renderPicker(jeanne);

    expect(screen.getByTestId('avatar-initials')).toHaveTextContent('JD');
    const buttons = await openMenu();
    expect(buttons.map((candidate) => candidate.text)).toEqual(['Choisir une photo', 'Annuler']);
  });

  it("envoie l'image choisie et met à jour l'utilisateur", async () => {
    const updated = { ...jeanne, avatar_url: 'http://api.test/storage/u/conversions/avatar-thumb.webp' };
    const { setUser, service, pick } = await renderPicker(jeanne);
    service.uploadAvatar.mockResolvedValue(updated);

    await button(await openMenu(), 'Choisir une photo').onPress?.();

    expect(pick).toHaveBeenCalled();
    expect(service.uploadAvatar).toHaveBeenCalledWith(file);
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(updated));
  });

  it("n'envoie rien si l'utilisateur annule le choix", async () => {
    const { service } = await renderPicker(jeanne, { pick: jest.fn().mockResolvedValue(null) });

    await button(await openMenu(), 'Choisir une photo').onPress?.();

    expect(service.uploadAvatar).not.toHaveBeenCalled();
  });

  it('avec une photo, propose de la retirer', async () => {
    const withPhoto = { ...jeanne, avatar_url: 'http://api.test/storage/u/conversions/avatar-thumb.webp' };
    const { setUser, service } = await renderPicker(withPhoto);
    service.removeAvatar.mockResolvedValue(jeanne);

    expect(screen.getByTestId('avatar-image')).toBeTruthy();
    await button(await openMenu(), 'Retirer la photo').onPress?.();

    expect(service.removeAvatar).toHaveBeenCalled();
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(jeanne));
  });

  it("affiche l'erreur de l'API sous la photo", async () => {
    const { setUser, service } = await renderPicker(jeanne);
    service.uploadAvatar.mockRejectedValue(
      new ApiError(422, 'Invalide', { avatar: ['La taille du fichier de photo de profil ne peut pas dépasser 5120 kilo-octets.'] }),
    );

    await button(await openMenu(), 'Choisir une photo').onPress?.();

    expect(await screen.findByTestId('avatar-error')).toHaveTextContent(
      'La taille du fichier de photo de profil ne peut pas dépasser 5120 kilo-octets.',
    );
    expect(setUser).not.toHaveBeenCalled();
  });
});

