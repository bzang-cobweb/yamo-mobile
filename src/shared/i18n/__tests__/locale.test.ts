import type { MessageKey } from '../messages';
import { pickBestLocale, translate } from '../locale';

describe('pickBestLocale', () => {
  const available = ['fr', 'en'];

  it("parcourt les langues de l'appareil dans leur ordre", () => {
    expect(pickBestLocale(['de-CH', 'en-GB', 'fr'], available)).toBe('en');
  });

  it('ramène une langue régionale à sa langue', () => {
    expect(pickBestLocale(['fr-CH'], available)).toBe('fr');
    expect(pickBestLocale(['en_US'], available)).toBe('en');
  });

  it('prend la langue par défaut quand aucune ne correspond', () => {
    expect(pickBestLocale(['de'], available)).toBe('fr');
    expect(pickBestLocale([], available)).toBe('fr');
  });

  it("respecte la langue par défaut annoncée par l'API", () => {
    expect(pickBestLocale(['de'], available, 'en')).toBe('en');
  });

  it("ignore une langue proposée par l'API dont l'app n'a pas les textes", () => {
    expect(pickBestLocale(['it', 'en'], ['fr', 'en', 'it'])).toBe('en');
  });

  it("ignore une langue de l'app que l'API ne propose plus", () => {
    expect(pickBestLocale(['en', 'fr'], ['fr'])).toBe('fr');
  });
});

describe('translate', () => {
  const fr = { 'home.greeting': 'Bonjour :name', 'a.fullName': 'Connecté en tant que :fullName', 'a.email': 'E-mail : :email' };

  it("prend le texte servi par l'API et remplace les variables au format Laravel", () => {
    expect(translate(fr, 'fr', 'home.greeting', { name: 'jeanne' })).toBe('Bonjour jeanne');
    expect(translate(fr, 'fr', 'a.fullName' as MessageKey, { fullName: 'Jeanne Dupont' })).toBe('Connecté en tant que Jeanne Dupont');
    expect(translate(fr, 'fr', 'a.email' as MessageKey, { email: 'j@x.ch' })).toBe('E-mail : j@x.ch');
  });

  it("affiche la clé quand l'API ne l'a pas envoyée", () => {
    expect(translate({}, 'fr', 'profile.title')).toBe('profile.title');
  });

  it("garde en local les seuls textes de l'absence de réseau, dans la langue demandée", () => {
    expect(translate({}, 'fr', 'offline.message')).toMatch(/^Connexion impossible/);
    expect(translate({}, 'en', 'offline.retry')).toBe('Try again');
    expect(translate({ 'offline.retry': 'venu de l’API' }, 'fr', 'offline.retry')).toBe('Réessayer');
  });
});
