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
  const now = new Date('2026-11-19T12:00:00Z');

  it('récente : relative, textes servis ; au-delà d’une semaine : la date', () => {
    const t = TEST_I18N.t;
    expect(relativeTime('2026-11-19T11:59:30Z', t, 'fr', now)).toBe("à l'instant");
    expect(relativeTime('2026-11-19T11:55:00Z', t, 'fr', now)).toBe('il y a 5 min');
    expect(relativeTime('2026-11-19T09:00:00Z', t, 'fr', now)).toBe('il y a 3 h');
    expect(relativeTime('2026-11-18T10:00:00Z', t, 'fr', now)).toBe('hier');
    expect(relativeTime('2026-11-15T12:00:00Z', t, 'fr', now)).toBe('il y a 4 jours');
    expect(relativeTime('2026-10-01T12:00:00Z', t, 'fr', now)).toBe('01/10/2026');
    expect(relativeTime('2026-10-01T12:00:00Z', t, 'de', now)).toBe('01.10.2026');
    expect(relativeTime(null, t, 'fr', now)).toBe('');
  });
});
