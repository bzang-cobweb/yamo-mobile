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
  it('remplace les paramètres', () => {
    expect(translate('fr', 'home.greeting', { name: 'jeanne' })).toBe('Bonjour jeanne');
    expect(translate('en', 'home.greeting', { name: 'jeanne' })).toBe('Hello jeanne');
  });
});
