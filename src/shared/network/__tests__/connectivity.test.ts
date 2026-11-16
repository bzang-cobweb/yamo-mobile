import { isOnline } from '../connectivity';

jest.mock('expo-network', () => ({ addNetworkStateListener: jest.fn(), useNetworkState: jest.fn() }));

describe('isOnline', () => {
  it('en ligne seulement si connecté et internet joignable', () => {
    expect(isOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isOnline({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(isOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it("tant que l'état est inconnu, suppose en ligne (pas de clignotement au démarrage)", () => {
    expect(isOnline({})).toBe(true);
    expect(isOnline({ isConnected: true })).toBe(true);
  });
});
