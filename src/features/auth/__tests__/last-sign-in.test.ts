import * as SecureStore from 'expo-secure-store';

import type { User } from '../types';
import { channelOf, clearLastSignIn, loginValuesFor, readLastPhoneCountry, readLastSignIn, saveLastSignIn } from '../utils/last-sign-in';

// Le dernier moyen de connexion, gardé dans le stockage chiffré de l'appareil (décision 2026-11-28-app-connexion-panneau).
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => void mockStore.set(key, value)),
  deleteItemAsync: jest.fn(async (key: string) => void mockStore.delete(key)),
}));

const user = {
  id: 1,
  first_name: 'Awa',
  last_name: 'Diallo',
  email: 'awa@example.test',
  email_masked: 'a•••@example.test',
  phone: '+41790000067',
  phone_country: 'CH',
  phone_masked: '+41 ••• 67',
} as User;

describe('last-sign-in : la mémoire du dernier moyen de connexion', () => {
  beforeEach(() => mockStore.clear());

  it('rien de mémorisé : null', async () => {
    await expect(readLastSignIn()).resolves.toBeNull();
    await expect(readLastPhoneCountry()).resolves.toBeNull();
  });

  it('après une connexion : le canal, l’e-mail, le numéro, leurs versions masquées, le pays, le prénom et le nom', async () => {
    await saveLastSignIn(user, 'phone');

    await expect(readLastSignIn()).resolves.toEqual({
      channel: 'phone',
      email: 'awa@example.test',
      email_masked: 'a•••@example.test',
      phone: '+41790000067',
      phone_country: 'CH',
      phone_masked: '+41 ••• 67',
      first_name: 'Awa',
      last_name: 'Diallo',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });

  it('« Ce n’est pas vous ? » efface le dernier moyen, garde l’indicatif', async () => {
    await saveLastSignIn(user, 'email');
    await clearLastSignIn();

    await expect(readLastSignIn()).resolves.toBeNull();
    await expect(readLastPhoneCountry()).resolves.toBe('CH');
  });

  it('une valeur illisible, ou sans l’identifiant de son canal : null', async () => {
    mockStore.set('yamo.auth.last-sign-in', '{pas du json');
    await expect(readLastSignIn()).resolves.toBeNull();

    mockStore.set('yamo.auth.last-sign-in', JSON.stringify({ channel: 'email', email: null, phone: '+41790000067' }));
    await expect(readLastSignIn()).resolves.toBeNull();
  });

  it('l’identifiant d’un canal pour POST /auth/login, et le canal d’un code envoyé', async () => {
    await saveLastSignIn(user, 'email');
    const memory = (await readLastSignIn())!;

    expect(loginValuesFor(memory, 'email')).toEqual({ channel: 'email', email: 'awa@example.test' });
    expect(loginValuesFor(memory, 'phone')).toEqual({ channel: 'phone', phone: '+41790000067', phone_country: 'CH' });
    expect(loginValuesFor({ ...memory, phone: null }, 'phone')).toBeNull();
    expect(channelOf('sms')).toBe('phone');
    expect(channelOf('email')).toBe('email');
  });
});
