import { NOTIFICATION_CARD_MAX, plainText, truncate, truncateSegments } from '../utils/preview';

describe('aperçu d’une notification sur sa carte (décision 2026-11-26-cartes-notifications-tronquees)', () => {
  it('retire les balises sans les couper, réduit les retours à la ligne et les espaces', () => {
    expect(plainText('Bonjour,\n<b>Je suis</b>   très <a href="/x">intéressé</a>.\nMerci')).toBe('Bonjour, Je suis très intéressé. Merci');
    // Un « < » qui n'ouvre pas de balise reste.
    expect(plainText('Prix < 50 000 et > 20 000')).toBe('Prix < 50 000 et > 20 000');
  });

  it('tronque à la fin d’un mot, suivi de « … » ; laisse un texte court tel quel', () => {
    expect(truncate('Court.', NOTIFICATION_CARD_MAX)).toBe('Court.');
    expect(truncate('un deux trois quatre cinq', 16)).toBe('un deux trois…');
    // Un mot trop long pour une coupe à la fin d'un mot : coupé à la limite.
    expect(truncate('anticonstitutionnellement', 10)).toBe('anticonsti…');
  });

  it('les passages liés ne sont jamais coupés : entiers, ou retirés avec la suite', () => {
    const segments = [
      { text: 'Votre demande pour « ', link: null },
      { text: 'Studio meublé à Bonanjo', link: '/offers/24' },
      { text: ' » a été acceptée.', link: null },
    ];

    expect(truncateSegments(segments, 200)).toEqual(segments);
    // La limite tombe dans le passage lié : il disparaît, le texte s'arrête avant.
    expect(truncateSegments(segments, 30)).toEqual([{ text: 'Votre demande pour «…', link: null }]);
    // La limite tombe après le passage lié : il reste entier, la suite est coupée.
    expect(truncateSegments(segments, 52)).toEqual([segments[0], segments[1], { text: ' » a été…', link: null }]);
  });
});
