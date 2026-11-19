import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import type { ApiClient } from '@/shared/api/ApiClient';

import { FavoriteHeart } from '../components/FavoriteHeart';
import { ListService, listService } from '../services/ListService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));

const FAVORITE = { active: false, endpoint: '/v1/offers/7/favorite' };

async function show(favorite = FAVORITE) {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })}>
      <I18nContext.Provider value={TEST_I18N}>
        <FavoriteHeart favorite={favorite} testID="heart" />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
}

describe('FavoriteHeart (décision 2026-11-19-contrat-vedette-favoris)', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('vide, puis plein dès qu’on le touche ; l’API reçoit PUT', async () => {
    const set = jest.spyOn(listService, 'setFavorite').mockResolvedValue(undefined);
    await show();

    expect(screen.getByTestId('heart').props.accessibilityLabel).toBe('Ajouter aux favoris');
    await act(async () => {
      fireEvent.press(screen.getByTestId('heart'));
    });

    expect(set).toHaveBeenCalledWith('/v1/offers/7/favorite', true);
    expect(screen.getByTestId('heart').props.accessibilityLabel).toBe('Retirer des favoris');
  });

  it('en cas d’échec, il revient à son état et un message s’affiche', async () => {
    jest.spyOn(listService, 'setFavorite').mockRejectedValue(new Error('offline'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await show({ ...FAVORITE, active: true });

    await act(async () => {
      fireEvent.press(screen.getByTestId('heart'));
    });

    expect(screen.getByTestId('heart').props.accessibilityLabel).toBe('Retirer des favoris');
    expect(alert).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.');
  });
});

describe('ListService.setFavorite', () => {
  it('PUT pour ajouter, DELETE pour retirer, et refuse un point d’API hors de /v1/', async () => {
    const client = { request: jest.fn().mockResolvedValue(undefined), delete: jest.fn().mockResolvedValue(undefined) };
    const service = new ListService(client as unknown as ApiClient);

    await service.setFavorite('/v1/offers/7/favorite', true);
    await service.setFavorite('/v1/offers/7/favorite', false);

    expect(client.request).toHaveBeenCalledWith('/v1/offers/7/favorite', { method: 'PUT' });
    expect(client.delete).toHaveBeenCalledWith('/v1/offers/7/favorite');
    await expect(service.setFavorite('https://evil.test/x', true)).rejects.toThrow();
    await expect(service.setFavorite('/v1/../admin', true)).rejects.toThrow();
    await expect(service.setFavorite('/v1/auth/me', false)).rejects.toThrow();
    await expect(service.setFavorite('/v1/offers/7', false)).rejects.toThrow();
  });
});
