import type { ApiClient } from '@/shared/api/ApiClient';

import { NotificationService } from '../services/NotificationService';


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
