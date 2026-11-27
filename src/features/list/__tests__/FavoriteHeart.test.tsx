import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import type { ApiClient } from '@/shared/api/ApiClient';

import { FavoriteHeart } from '../components/FavoriteHeart';
import { ListService, listService } from '../services/ListService';
import type { FavoritePanel } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const FAVORITE = { active: false, endpoint: '/v1/offers/7/favorite' };

/** Le panneau servi par l'API : ses listes nommées, sans « Récemment consultés ». */
const PANEL: FavoritePanel = {
  title: 'Enregistrer dans une liste',
  create: { label: 'Créer une liste', placeholder: 'Nom de la liste', submit: 'Créer', max_length: 60 },
  lists: [
    { id: '3', name: 'Favoris', subtitle: '2 offres', image: 'http://api.test/photo.webp' },
    { id: '4', name: 'Été', subtitle: 'Aucune offre', image: null },
  ],
};

async function show(favorite = FAVORITE) {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } })}>
      <I18nContext.Provider value={TEST_I18N}>
        <FavoriteHeart favorite={favorite} testID="heart" />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
}

async function openPanel() {
  await show();
  await act(async () => {
    await fireEvent.press(screen.getByTestId('heart'));
  });
}

describe('FavoriteHeart (décisions 2026-11-19-contrat-vedette-favoris et 2026-11-27-listes-de-favoris)', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('vide : le toucher ouvre le panneau de ses listes ; une liste touchée y range l’offre et le cœur se remplit', async () => {
    jest.spyOn(listService, 'favoritePanel').mockResolvedValue(PANEL);
    const set = jest.spyOn(listService, 'setFavorite').mockResolvedValue(undefined);
    await openPanel();

    expect(screen.getByTestId('heart').props.accessibilityLabel).toBe('Ajouter aux favoris');
    expect(await screen.findByTestId('heart-picker-list-3')).toHaveTextContent(/Favoris.*2 offres/);
    expect(screen.getByTestId('heart-picker-list-4-empty')).toBeTruthy();
    // Le titre servi avec les listes ; le panneau à la hauteur de son contenu.
    expect(screen.getByTestId('heart-panel-header')).toHaveTextContent(/Enregistrer dans une liste/);
    expect(set).not.toHaveBeenCalled();

    await act(async () => {
      await fireEvent.press(screen.getByTestId('heart-picker-list-4'));
    });

    expect(set).toHaveBeenCalledWith('/v1/offers/7/favorite', true, { wishlist: '4' });
    expect(screen.queryByTestId('heart-picker-lists')).toBeNull();
    expect(screen.getByTestId('heart').props.accessibilityLabel).toBe('Retirer des favoris');
  });

  it('« Créer une liste » en bas : un nom, puis la liste est créée et l’offre y est rangée', async () => {
    jest.spyOn(listService, 'favoritePanel').mockResolvedValue(PANEL);
    const set = jest.spyOn(listService, 'setFavorite').mockResolvedValue(undefined);
    await openPanel();

    await act(async () => {
      await fireEvent.press(await screen.findByTestId('heart-picker-create'));
    });
    // Sans nom, le bouton ne fait rien.
    expect(screen.getByTestId('heart-picker-submit').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByTestId('heart-picker-name'), '  Week-end ');
    await act(async () => {
      await fireEvent.press(screen.getByTestId('heart-picker-submit'));
    });

    expect(set).toHaveBeenCalledWith('/v1/offers/7/favorite', true, { name: 'Week-end' });
    expect(screen.getByTestId('heart').props.accessibilityLabel).toBe('Retirer des favoris');
  });

  it('une erreur de l’API s’affiche sous le nom, le panneau reste ouvert et le cœur vide', async () => {
    jest.spyOn(listService, 'favoritePanel').mockResolvedValue(PANEL);
    jest.spyOn(listService, 'setFavorite').mockRejectedValue(new ApiError(422, 'Invalide', { name: ['Trop long.'] }));
    await openPanel();

    await act(async () => {
      await fireEvent.press(await screen.findByTestId('heart-picker-create'));
    });
    await fireEvent.changeText(screen.getByTestId('heart-picker-name'), 'Un nom');
    await act(async () => {
      await fireEvent.press(screen.getByTestId('heart-picker-submit'));
    });

    expect(screen.getByTestId('heart-picker-error')).toHaveTextContent('Trop long.');
    expect(screen.getByTestId('heart').props.accessibilityLabel).toBe('Ajouter aux favoris');
  });

  it('plein : le toucher la retire de toutes ses listes, aussitôt ; l’API reçoit DELETE', async () => {
    const set = jest.spyOn(listService, 'setFavorite').mockResolvedValue(undefined);
    const panel = jest.spyOn(listService, 'favoritePanel');
    await show({ ...FAVORITE, active: true });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('heart'));
    });

    expect(set).toHaveBeenCalledWith('/v1/offers/7/favorite', false);
    expect(panel).not.toHaveBeenCalled();
    expect(screen.getByTestId('heart').props.accessibilityLabel).toBe('Ajouter aux favoris');
  });

  it('en cas d’échec du retrait, il revient à son état et un message s’affiche', async () => {
    jest.spyOn(listService, 'setFavorite').mockRejectedValue(new Error('offline'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await show({ ...FAVORITE, active: true });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('heart'));
    });

    expect(screen.getByTestId('heart').props.accessibilityLabel).toBe('Retirer des favoris');
    expect(alert).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.');
  });
});

describe('ListService.setFavorite et favoritePanel', () => {
  it('PUT pour ajouter (avec la liste choisie ou le nom de la nouvelle), DELETE pour retirer, et refuse un point d’API hors de /v1/', async () => {
    const client = { request: jest.fn().mockResolvedValue(undefined), delete: jest.fn().mockResolvedValue(undefined), get: jest.fn().mockResolvedValue({ data: PANEL }) };
    const service = new ListService(client as unknown as ApiClient);

    await service.setFavorite('/v1/offers/7/favorite', true);
    await service.setFavorite('/v1/offers/7/favorite', true, { wishlist: '3' });
    await service.setFavorite('/v1/offers/7/favorite', true, { name: 'Été' });
    await service.setFavorite('/v1/offers/7/favorite', false);

    expect(client.request).toHaveBeenNthCalledWith(1, '/v1/offers/7/favorite', { method: 'PUT' });
    expect(client.request).toHaveBeenNthCalledWith(2, '/v1/offers/7/favorite', { method: 'PUT', body: { wishlist: '3' } });
    expect(client.request).toHaveBeenNthCalledWith(3, '/v1/offers/7/favorite', { method: 'PUT', body: { name: 'Été' } });
    expect(client.delete).toHaveBeenCalledWith('/v1/offers/7/favorite');
    expect(await service.favoritePanel('/v1/offers/7/favorite')).toEqual(PANEL);
    expect(client.get).toHaveBeenCalledWith('/v1/offers/7/favorite');
    await expect(service.setFavorite('https://evil.test/x', true)).rejects.toThrow();
    await expect(service.setFavorite('/v1/../admin', true)).rejects.toThrow();
    await expect(service.setFavorite('/v1/auth/me', false)).rejects.toThrow();
    await expect(service.setFavorite('/v1/offers/7', false)).rejects.toThrow();
    await expect(service.favoritePanel('/v1/auth/me')).rejects.toThrow();
  });
});
