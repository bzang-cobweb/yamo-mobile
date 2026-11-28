import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import type { FormDefinition, FormFieldDefinition } from '@/features/form/types';
import { ApiError } from '@/shared/api/errors';
import { currentToast, hideToast } from '@/shared/components/Toast';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthSheetHost, closeAuthSheet, isAuthSheetOpen, openAuthSheet } from '../components/AuthSheet';
import { loginService } from '../services/LoginService';
import { registerService } from '../services/RegisterService';
import { sessionService } from '../services/SessionService';
import { verificationService } from '../services/VerificationService';
import type { Challenge, User } from '../types';
import { readLastSignIn, saveLastSignIn } from '../utils/last-sign-in';

// Se connecter ou s'inscrire dans un panneau : identifiant → code → mot de passe → inscription (contrat
// 2026-11-28-connexion-panneau, décision 2026-11-28-app-connexion-panneau). L'API est simulée ; les formulaires sont
// les vrais (`FormLoader`, `DynamicForm`), avec des définitions servies par un `formService` simulé.
jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('../utils/device-name', () => ({ deviceName: () => 'iPhone' }));

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => void mockStore.set(key, value)),
  deleteItemAsync: jest.fn(async (key: string) => void mockStore.delete(key)),
}));

const mockSignIn = jest.fn();
jest.mock('../hooks/useAuth', () => {
  const { TEST_I18N: i18n } = jest.requireActual<typeof import('@/shared/i18n/test-messages')>('@/shared/i18n/test-messages');

  return { useAuth: () => ({ user: null, signIn: mockSignIn, t: i18n.t }) };
});
jest.mock('../services/LoginService', () => ({ loginService: { login: jest.fn() } }));
jest.mock('../services/VerificationService', () => ({ verificationService: { verify: jest.fn(), resend: jest.fn() } }));
jest.mock('../services/SessionService', () => ({ sessionService: { open: jest.fn() } }));
jest.mock('../services/RegisterService', () => ({ registerService: { register: jest.fn() } }));

function field(overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, 'name' | 'type'>): FormFieldDefinition {
  return { label: overrides.name, placeholder: null, help: null, required: false, default: null, options: [], ...overrides };
}

function form(name: string, title: string | null, submit: string, fields: FormFieldDefinition[]): FormDefinition {
  return { name, title, subtitle: null, submit: { label: submit }, fields };
}

const COUNTRIES = [
  { value: 'CM', label: 'Cameroun', hint: '+237' },
  { value: 'CH', label: 'Suisse', hint: '+41' },
];

/** Les formulaires servis, d'après la section « API » du contrat. */
function definition(name: string, params: Record<string, string>): FormDefinition {
  switch (name) {
    case 'auth.login':
      return form('auth.login', 'Se connecter', 'Continuer', [
        field({ name: 'channel', type: 'segmented', default: 'email', options: [{ value: 'email', label: 'E-mail' }, { value: 'phone', label: 'Téléphone' }] }),
        field({ name: 'email', type: 'email', visible_when: { field: 'channel', value: 'email' } }),
        field({ name: 'phone', type: 'phone', default: { country: 'CM', number: null }, options: COUNTRIES, visible_when: { field: 'channel', value: 'phone' } }),
      ]);
    case 'auth.code':
      return form('auth.code', null, 'Valider', [field({ name: 'code', type: 'code' })]);
    case 'auth.session.password':
      return form(name, 'Votre mot de passe', 'Se connecter', [field({ name: 'password', type: 'password' })]);
    case 'auth.session.new-password':
      return form(name, 'Choisissez un mot de passe', 'Continuer', [field({ name: 'password', type: 'password' }), field({ name: 'password_confirmation', type: 'password' })]);
    case 'auth.register':
      return form('auth.register', 'Créer votre compte', 'Créer mon compte', [
        field({ name: 'first_name', type: 'text' }),
        field({ name: 'last_name', type: 'text' }),
        params.channel === 'email' ? field({ name: 'phone', type: 'phone', default: { country: 'CM', number: null }, options: COUNTRIES }) : field({ name: 'email', type: 'email' }),
      ]);
    default:
      throw new Error(`formulaire inattendu : ${name}`);
  }
}

const mockGetForm = jest.fn((name: string, _record?: string, params: Record<string, string> = {}) => Promise.resolve(definition(name, params)));
jest.mock('@/features/form/services/FormService', () => ({
  formService: { get: (...args: [string, string | undefined, Record<string, string> | undefined]) => mockGetForm(...args) },
}));

const byEmail: Challenge = { challenge: 'c-email', channel: 'email', destination: 'a•••@example.test' };
const bySms: Challenge = { challenge: 'c-sms', channel: 'sms', destination: '+41 ••• 67' };

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

async function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={TEST_I18N}>
        <AuthSheetHost />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
  await act(async () => openAuthSheet());
}

/** Laisse passer les lectures du stockage et les chargements des formulaires. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function typeCode(code = '123456') {
  await screen.findByTestId('field-code');
  await fireEvent.changeText(screen.getByTestId('field-code'), code);
  await settle();
}

describe('le panneau « Se connecter ou s’inscrire »', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.clear();
    hideToast();
    closeAuthSheet();
  });

  it('s’ouvre à sa taille maximale, titré « Se connecter ou s’inscrire » ; la croix le ferme', async () => {
    await show();
    await settle();

    const header = screen.getByTestId('auth-sheet-header');
    expect(header).toHaveTextContent("Se connecter ou s'inscrire");
    // Taille maximale : pas la taille du contenu (`flex: 1`).
    expect(screen.getByTestId('auth-sheet')).toHaveStyle({ flex: 1 });

    await fireEvent.press(screen.getByTestId('auth-sheet-close'));
    expect(isAuthSheetOpen()).toBe(false);
    expect(screen.queryByTestId('auth-sheet')).toBeNull();
  });

  it('sans mémoire : le formulaire, le code envoyé dès 6 chiffres, le mot de passe, connecté et mémorisé', async () => {
    jest.mocked(loginService.login).mockResolvedValue(byEmail);
    jest.mocked(verificationService.verify).mockResolvedValue({ kind: 'password', challenge: 'c-email', mode: 'sign-in' });
    jest.mocked(sessionService.open).mockResolvedValue({ kind: 'session', session: { user, token: 't' } });
    await show();

    await fireEvent.changeText(await screen.findByTestId('field-email'), 'awa@example.test');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();
    expect(loginService.login).toHaveBeenCalledWith({ channel: 'email', email: 'awa@example.test' });
    expect(screen.getByTestId('auth-code-sent')).toHaveTextContent('Nous avons envoyé un code à a•••@example.test.');

    // Cinq chiffres : rien ; le sixième envoie le code, sans toucher le bouton.
    await typeCode('12345');
    expect(verificationService.verify).not.toHaveBeenCalled();
    await typeCode('123456');
    expect(verificationService.verify).toHaveBeenCalledWith(byEmail, '123456', 'iPhone');

    // Compte avec mot de passe : « Votre mot de passe », et « Mot de passe oublié ? ».
    expect(await screen.findByText('Votre mot de passe')).toBeTruthy();
    expect(screen.getByTestId('auth-forgot-password')).toHaveTextContent('Mot de passe oublié ?');
    await fireEvent.changeText(screen.getByTestId('field-password'), 'secret');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();

    expect(sessionService.open).toHaveBeenCalledWith('c-email', { password: 'secret' }, false, 'iPhone');
    expect(mockSignIn).toHaveBeenCalledWith({ user, token: 't' });
    expect(isAuthSheetOpen()).toBe(false);
    await expect(readLastSignIn()).resolves.toMatchObject({ channel: 'email', email: 'awa@example.test', first_name: 'Awa', last_name: 'Diallo' });
  });

  it('défi expiré ou déjà servi (erreur sur `code`) : le message dans le bandeau, retour au formulaire', async () => {
    jest.mocked(loginService.login).mockResolvedValue(byEmail);
    jest.mocked(verificationService.verify).mockResolvedValue({ kind: 'password', challenge: 'c-email', mode: 'sign-in' });
    jest.mocked(sessionService.open).mockRejectedValue(new ApiError(422, 'Code expiré.', { code: ['Ce code a expiré, demandez-en un nouveau.'] }));
    await show();

    await fireEvent.changeText(await screen.findByTestId('field-email'), 'a@b.ch');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();
    await typeCode();
    await fireEvent.changeText(await screen.findByTestId('field-password'), 'secret');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();

    expect(currentToast()?.message).toBe('Ce code a expiré, demandez-en un nouveau.');
    expect(await screen.findByTestId('field-email')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('« Mot de passe oublié ? » : un nouveau mot de passe confirmé, envoyé avec reset', async () => {
    jest.mocked(loginService.login).mockResolvedValue(byEmail);
    jest.mocked(verificationService.verify).mockResolvedValue({ kind: 'password', challenge: 'c-email', mode: 'sign-in' });
    jest.mocked(sessionService.open).mockResolvedValue({ kind: 'session', session: { user, token: 't' } });
    await show();

    await fireEvent.changeText(await screen.findByTestId('field-email'), 'awa@example.test');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();
    await typeCode();
    await fireEvent.press(await screen.findByTestId('auth-forgot-password'));
    await settle();

    expect(screen.getByText('Choisissez un mot de passe')).toBeTruthy();
    expect(screen.queryByTestId('auth-forgot-password')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('field-password'), 'nouveau');
    await fireEvent.changeText(screen.getByTestId('field-password_confirmation'), 'nouveau');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();

    expect(sessionService.open).toHaveBeenCalledWith('c-email', { password: 'nouveau', password_confirmation: 'nouveau' }, true, 'iPhone');
    expect(mockSignIn).toHaveBeenCalled();
  });

  it('compte sans mot de passe (create) : il en choisit un, confirmé, puis connecté', async () => {
    jest.mocked(loginService.login).mockResolvedValue(byEmail);
    jest.mocked(verificationService.verify).mockResolvedValue({ kind: 'password', challenge: 'c-email', mode: 'create' });
    jest.mocked(sessionService.open).mockResolvedValue({ kind: 'session', session: { user, token: 't' } });
    await show();

    await fireEvent.changeText(await screen.findByTestId('field-email'), 'awa@example.test');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();
    await typeCode();

    expect(await screen.findByText('Choisissez un mot de passe')).toBeTruthy();
    expect(screen.queryByTestId('auth-forgot-password')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('field-password'), 'secret');
    await fireEvent.changeText(screen.getByTestId('field-password_confirmation'), 'secret');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();

    expect(sessionService.open).toHaveBeenCalledWith('c-email', { password: 'secret', password_confirmation: 'secret' }, false, 'iPhone');
    expect(mockSignIn).toHaveBeenCalledWith({ user, token: 't' });
  });

  it('pas de compte (register) : mot de passe confirmé, puis l’inscription (?channel du défi), puis connecté', async () => {
    jest.mocked(loginService.login).mockResolvedValue(bySms);
    jest.mocked(verificationService.verify).mockResolvedValue({ kind: 'password', challenge: 'c-sms', mode: 'register' });
    jest.mocked(sessionService.open).mockResolvedValue({ kind: 'register', challenge: 'c-sms' });
    jest.mocked(registerService.register).mockResolvedValue({ user: { ...user, email: null, email_masked: null }, token: 'u' });
    await show();

    await fireEvent.press(await screen.findByTestId('field-channel-option-phone'));
    await fireEvent.changeText(screen.getByTestId('field-phone'), '790000067');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();
    expect(loginService.login).toHaveBeenCalledWith(expect.objectContaining({ channel: 'phone', phone: '790000067' }));
    await typeCode();

    await fireEvent.changeText(await screen.findByTestId('field-password'), 'secret');
    await fireEvent.changeText(screen.getByTestId('field-password_confirmation'), 'secret');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();

    // Identifié par téléphone : l'inscription demande l'e-mail, facultatif.
    expect(mockGetForm).toHaveBeenLastCalledWith('auth.register', undefined, { channel: 'phone' });
    expect(await screen.findByText('Créer votre compte')).toBeTruthy();
    expect(screen.getByTestId('field-email')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('field-first_name'), 'Awa');
    await fireEvent.changeText(screen.getByTestId('field-last_name'), 'Diallo');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();

    expect(registerService.register).toHaveBeenCalledWith('c-sms', { first_name: 'Awa', last_name: 'Diallo', email: '' }, 'iPhone');
    expect(mockSignIn).toHaveBeenCalledWith(expect.objectContaining({ token: 'u' }));
    expect(isAuthSheetOpen()).toBe(false);
    await expect(readLastSignIn()).resolves.toMatchObject({ channel: 'phone', phone: '+41790000067' });
  });

  it('inscription par e-mail : le téléphone facultatif prend l’indicatif mémorisé, pas celui servi', async () => {
    await saveLastSignIn(user, 'email');
    jest.mocked(loginService.login).mockResolvedValue(byEmail);
    jest.mocked(verificationService.verify).mockResolvedValue({ kind: 'password', challenge: 'c-email', mode: 'register' });
    jest.mocked(sessionService.open).mockResolvedValue({ kind: 'register', challenge: 'c-email' });
    jest.mocked(registerService.register).mockResolvedValue({ user, token: 'u' });
    await show();
    await settle();

    await fireEvent.press(screen.getByTestId('auth-welcome-sign-in'));
    await settle();
    await typeCode();
    await fireEvent.changeText(await screen.findByTestId('field-password'), 'secret');
    await fireEvent.changeText(screen.getByTestId('field-password_confirmation'), 'secret');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();

    expect(mockGetForm).toHaveBeenLastCalledWith('auth.register', undefined, { channel: 'email' });
    await fireEvent.changeText(await screen.findByTestId('field-first_name'), 'Awa');
    await fireEvent.changeText(screen.getByTestId('field-last_name'), 'Diallo');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();

    expect(registerService.register).toHaveBeenCalledWith('c-email', expect.objectContaining({ phone_country: 'CH' }), 'iPhone');
  });

  it('compte en attente de suppression : la proposition de le récupérer', async () => {
    jest.mocked(loginService.login).mockResolvedValue(byEmail);
    jest.mocked(verificationService.verify).mockResolvedValue({ kind: 'restore', challenge: 'c-email', deletionDate: '20 décembre 2026' });
    await show();

    await fireEvent.changeText(await screen.findByTestId('field-email'), 'awa@example.test');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();
    await typeCode();

    expect(screen.getByTestId('restore-account')).toBeTruthy();
  });

  it('avec mémoire : « Bon retour, Prénom Nom », l’identifiant masqué, la note ; « Se connecter » envoie le code', async () => {
    await saveLastSignIn(user, 'email');
    jest.mocked(loginService.login).mockResolvedValue(byEmail);
    await show();
    await settle();

    expect(screen.getByTestId('auth-welcome-title')).toHaveTextContent('Bon retour, Awa Diallo');
    expect(screen.getByTestId('auth-welcome-identifier')).toHaveTextContent('a•••@example.test');
    expect(screen.getByTestId('auth-welcome-note')).toHaveTextContent('Nous allons vous envoyer un code par e-mail pour vous connecter.');
    expect(screen.queryByTestId('form-auth.login')).toBeNull();

    await fireEvent.press(screen.getByTestId('auth-welcome-sign-in'));
    await settle();

    expect(loginService.login).toHaveBeenCalledWith({ channel: 'email', email: 'awa@example.test' });
    expect(screen.getByTestId('auth-code-sent')).toHaveTextContent('Nous avons envoyé un code à a•••@example.test.');

    // Le retour revient à « Bon retour ».
    await fireEvent.press(screen.getByTestId('auth-code-back'));
    expect(screen.getByTestId('auth-welcome')).toBeTruthy();
  });

  it('avec mémoire par SMS : la note du SMS', async () => {
    await saveLastSignIn(user, 'phone');
    await show();
    await settle();

    expect(screen.getByTestId('auth-welcome-identifier')).toHaveTextContent('+41 ••• 67');
    expect(screen.getByTestId('auth-welcome-note')).toHaveTextContent('Nous allons vous envoyer un code par SMS pour vous connecter.');
  });

  it('« Ce n’est pas vous ? » efface la mémoire et montre le formulaire, l’indicatif mémorisé par défaut', async () => {
    await saveLastSignIn(user, 'email');
    jest.mocked(loginService.login).mockResolvedValue(bySms);
    await show();
    await settle();

    await fireEvent.press(screen.getByTestId('auth-not-you'));
    await settle();

    await expect(readLastSignIn()).resolves.toBeNull();
    expect(screen.getByTestId('form-auth.login')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('field-channel-option-phone'));
    await fireEvent.changeText(screen.getByTestId('field-phone'), '790000067');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();

    expect(loginService.login).toHaveBeenCalledWith({ channel: 'phone', phone: '790000067', phone_country: 'CH' });
  });

  it('« Envoyer un nouveau code » : le renvoi, le message dans le bandeau', async () => {
    jest.mocked(loginService.login).mockResolvedValue(byEmail);
    await show();

    await fireEvent.changeText(await screen.findByTestId('field-email'), 'awa@example.test');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();

    expect(screen.getByTestId('auth-code')).toHaveTextContent(/Vous ne l'avez pas reçu \?/);
    await fireEvent.press(screen.getByTestId('auth-code-resend'));
    await settle();

    expect(verificationService.resend).toHaveBeenCalledWith(byEmail);
    expect(currentToast()?.message).toBe(TEST_I18N.t('auth.resent'));
  });

  it('« Essayer autrement », l’autre identifiant mémorisé : un code par SMS, sans repasser par le formulaire', async () => {
    await saveLastSignIn(user, 'email');
    jest.mocked(loginService.login).mockResolvedValueOnce(byEmail).mockResolvedValueOnce(bySms);
    await show();
    await settle();

    await fireEvent.press(screen.getByTestId('auth-welcome-sign-in'));
    await settle();
    await fireEvent.press(screen.getByTestId('auth-code-other-way'));

    // Un panneau à la hauteur de son contenu : « Recevoir un code par SMS », le numéro masqué dessous.
    const sheet = screen.getByTestId('auth-other-way');
    expect(sheet).not.toHaveStyle({ flex: 1 });
    expect(screen.getByTestId('auth-other-way-header')).toHaveTextContent('Essayer autrement');
    const choice = within(sheet).getByTestId('auth-other-way-phone');
    expect(choice).toHaveTextContent(/Recevoir un code par SMS/);
    expect(within(choice).getByTestId('auth-other-way-masked')).toHaveTextContent('+41 ••• 67');

    await fireEvent.press(choice);
    await settle();

    expect(loginService.login).toHaveBeenLastCalledWith({ channel: 'phone', phone: '+41790000067', phone_country: 'CH' });
    expect(currentToast()?.message).toBe('Nous avons envoyé un code à +41 ••• 67.');
    expect(screen.getByTestId('auth-code-sent')).toHaveTextContent('Nous avons envoyé un code à +41 ••• 67.');
    expect(screen.queryByTestId('form-auth.login')).toBeNull();

    // L'inverse : parti par SMS, l'autre voie est l'e-mail masqué.
    await fireEvent.press(screen.getByTestId('auth-code-other-way'));
    expect(screen.getByTestId('auth-other-way-email')).toHaveTextContent(/Recevoir un code par e-mail/);
    expect(screen.getByTestId('auth-other-way-masked')).toHaveTextContent('a•••@example.test');
  });

  it('« Essayer autrement », l’autre identifiant inconnu : le formulaire, ce canal choisi, sans ligne masquée', async () => {
    jest.mocked(loginService.login).mockResolvedValue(byEmail);
    await show();

    await fireEvent.changeText(await screen.findByTestId('field-email'), 'awa@example.test');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await settle();
    await fireEvent.press(screen.getByTestId('auth-code-other-way'));

    expect(screen.getByTestId('auth-other-way-phone')).toHaveTextContent(/Recevoir un code par SMS/);
    expect(screen.queryByTestId('auth-other-way-masked')).toBeNull();

    await fireEvent.press(screen.getByTestId('auth-other-way-phone'));
    await settle();

    expect(loginService.login).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('form-auth.login')).toBeTruthy();
    // Le téléphone présélectionné : son champ est affiché, pas celui de l'e-mail.
    expect(screen.getByTestId('field-phone')).toBeTruthy();
    expect(screen.queryByTestId('field-email')).toBeNull();
  });
});
