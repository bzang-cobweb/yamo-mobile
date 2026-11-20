import { formatStamp } from '../utils/stamp';

describe('formatStamp (décision 2026-11-20-suivi-conversation)', () => {
  const now = new Date(2026, 10, 20, 15, 0);

  it('le jour même : l’heure seule', () => {
    expect(formatStamp(new Date(2026, 10, 20, 9, 5).toISOString(), 'fr', 'medium', now)).toBe('09:05');
  });

  it('un autre jour : la date et l’heure', () => {
    expect(formatStamp(new Date(2026, 10, 19, 9, 5).toISOString(), 'fr', 'medium', now)).toBe('19 nov. 2026, 09:05');
  });
});
