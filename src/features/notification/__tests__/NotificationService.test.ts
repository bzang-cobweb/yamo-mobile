import type { ApiClient } from '@/shared/api/ApiClient';

import { NotificationService } from '../services/NotificationService';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { relativeTime } from '../utils/relativeTime';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

describe('NotificationService', () => {
  it('liste, compte, marque lue, tout marque lu', async () => {
    const client = {
      get: jest.fn().mockResolvedValueOnce({ data: { items: [], next_cursor: null } }).mockResolvedValueOnce({ data: { unread: 3 } }),
      request: jest.fn().mockResolvedValue(undefined),
    };
    const service = new NotificationService(client as unknown as ApiClient);

    await service.list('abc=');
    expect(client.get).toHaveBeenCalledWith('/v1/notifications?cursor=abc%3D');
    expect(await service.unreadCount()).toBe(3);
    await service.read('a-1');
    expect(client.request).toHaveBeenCalledWith('/v1/notifications/a-1/read', { method: 'POST' });
    await service.readAll();
    expect(client.request).toHaveBeenLastCalledWith('/v1/notifications/read', { method: 'POST' });
  });
});

describe('relativeTime', () => {
  // Heure locale du moteur de test : les jours se comptent au calendrier.
  const now = new Date(2026, 10, 19, 12, 0);
  const at = (day: number, hour: number, minute = 0, month = 10) => new Date(2026, month, day, hour, minute).toISOString();

  it('à l’instant, il y a N min, puis l’heure ; hier à l’heure ; avant : la date, mois en lettres, et l’heure (décision 2026-11-22-date-carte-heure)', () => {
    const t = TEST_I18N.t;
    expect(relativeTime(new Date(now.getTime() - 30_000).toISOString(), t, 'fr', now)).toBe("à l'instant");
    expect(relativeTime(at(19, 11, 55), t, 'fr', now)).toBe('il y a 5 min');
    expect(relativeTime(at(19, 10, 30), t, 'fr', now)).toBe('10:30');
    expect(relativeTime(at(18, 23, 50), t, 'fr', now)).toBe('hier à 23:50');
    expect(relativeTime(at(15, 9, 5), t, 'fr', now)).toBe('15 nov. 2026 09:05');
    expect(relativeTime(at(1, 12, 0, 9), t, 'de', now)).toBe('1. Okt. 2026 12:00');
    expect(relativeTime(null, t, 'fr', now)).toBe('');
  });
});
