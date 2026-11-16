import { formatDate, parseIsoDate, toIsoDate } from '../utils/dates';

describe('dates (AAAA-MM-JJ en heure locale)', () => {
  it('lit et écrit une date sans décalage de fuseau', () => {
    const date = parseIsoDate('1990-04-12');

    expect(date?.getFullYear()).toBe(1990);
    expect(date?.getMonth()).toBe(3);
    expect(date?.getDate()).toBe(12);
    expect(toIsoDate(new Date(1990, 3, 12))).toBe('1990-04-12');
    expect(toIsoDate(new Date(2000, 0, 1, 0, 0, 0))).toBe('2000-01-01');
  });

  it('refuse une valeur vide, mal formée ou impossible', () => {
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate('12.04.1990')).toBeNull();
    expect(parseIsoDate('1990-02-30')).toBeNull();
  });

  it("affiche la date dans la langue de l'app", () => {
    expect(formatDate(new Date(1990, 3, 12), 'fr')).toBe('12 avril 1990');
    expect(formatDate(new Date(1990, 3, 12), 'en')).toBe('April 12, 1990');
  });
});
