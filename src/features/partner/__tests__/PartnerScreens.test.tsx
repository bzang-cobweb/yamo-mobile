import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { PartnerDetailScreen } from '../screens/PartnerDetailScreen';
import { PartnersScreen } from '../screens/PartnersScreen';
import type { Partner } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useRootNavigationState: () => undefined,
  useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockClick = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/PartnerService', () => ({ partnerService: { click: (...args: unknown[]) => mockClick(...args) } }));
let mockList: unknown;
const mockCalls: [string, string | undefined][] = [];
const mockFetchNextPage = jest.fn().mockResolvedValue(undefined);
jest.mock('@/features/list/hooks/useListDefinition', () => ({
  useListDefinition: (name: string, search?: string) => (
    mockCalls.push([name, search]),
    {
      data: mockList,
      isPending: mockList === undefined,
      isError: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
      reload: jest.fn().mockResolvedValue(undefined),
      refetch: jest.fn(),
    }
  ),
}));
let mockOne: { data?: Partner; isPending: boolean; isError: boolean; error: unknown } = { isPending: true, isError: false, error: null };
jest.mock('../hooks/usePartners', () => ({
  usePartner: () => ({ ...mockOne, refetch: jest.fn() }),
}));

const wouri: Partner = { id: '3', name: 'Déménageurs du Wouri', description: 'Déménagement clés en main.', url: 'https://wouri.test/fr', cta_label: 'Demander un devis', logo: null };

async function show(element: React.ReactElement) {
  await render(<I18nContext.Provider value={TEST_I18N}>{element}</I18nContext.Provider>);
}

// Décision 2026-11-23-partenaires-liste-detail.
function item(id: string, title: string, subtitle: string | null) {
  return { id, title, subtitle, image: null, rating: null, highlight: null, favorite: null, link: `/partners/${id}`, edit: null, actions: [], tag: null, counter: null, delete: null };
}

describe('la page « Partenaires »', () => {
  it('la liste générique : une carte par partenaire, logo, nom, description ; elle ouvre la page du partenaire', async () => {
    mockList = { name: 'partner.all', title: 'Partenaires', search: 'Rechercher…', empty: null, filters: [], items: [item('3', 'Déménageurs du Wouri', 'Déménagement clés en main.'), item('4', 'Assurances du Littoral', null)] };
    await show(<PartnersScreen />);

    expect(mockCalls.at(-1)).toEqual(['partner.all', '']);
    expect(screen.getByTestId('back-header-title')).toHaveTextContent('Partenaires');
    expect(screen.getByTestId('partners-item-3')).toHaveTextContent(/Déménageurs du Wouri.*Déménagement clés en main\./);
    expect(screen.getByTestId('partners-item-4')).toHaveTextContent(/Assurances du Littoral/);

    await fireEvent.press(screen.getByTestId('partners-item-4'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/partners/[id]', params: { id: '4' } });
  });

  it('la recherche, puis la suite en approchant du bas, comme toutes les listes (décision 2026-11-23-partenaires-recherche)', async () => {
    jest.useFakeTimers();
    mockList = { name: 'partner.all', title: 'Partenaires', search: 'Rechercher…', empty: null, filters: [], items: [item('3', 'Déménageurs du Wouri', null)] };
    await show(<PartnersScreen />);

    await fireEvent.changeText(screen.getByTestId('partners-list-search'), 'wouri');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(mockCalls.at(-1)).toEqual(['partner.all', 'wouri']);
    jest.useRealTimers();

    await fireEvent(screen.getByTestId('partners-list'), 'onEndReached');
    expect(mockFetchNextPage).toHaveBeenCalled();
  });
});

describe('la page d’un partenaire', () => {
  it('son nom, sa description, et son bouton qui compte un clic et ouvre son lien', async () => {
    mockOne = { isPending: false, isError: false, error: null, data: wouri };
    await show(<PartnerDetailScreen id="3" />);

    expect(screen.getByTestId('partner-name')).toHaveTextContent('Déménageurs du Wouri');
    // Sans slogan, rien sous le nom.
    expect(screen.queryByTestId('partner-slogan')).toBeNull();
    expect(screen.getByTestId('partner-description')).toHaveTextContent('Déménagement clés en main.');
    expect(screen.getByTestId('partner-cta-button')).toHaveTextContent('Demander un devis');

    await fireEvent.press(screen.getByTestId('partner-cta-button'));
    expect(mockClick).toHaveBeenCalledWith('3');
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://wouri.test/fr');
  });

  it('son e-mail et son téléphone, qui ouvrent l’e-mail et l’appel (décision 2026-11-24-partenaire-contact)', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mockOne = { isPending: false, isError: false, error: null, data: { ...wouri, contact_email: 'contact@wouri.test', contact_phone: '+237 6 70 00 00 02' } };
    await show(<PartnerDetailScreen id="3" />);

    expect(screen.getByTestId('partner-contact')).toHaveTextContent(/E-mail.*contact@wouri\.test.*Téléphone.*\+237 6 70 00 00 02/);
    // La description après le contact.
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('"partner-contact"')).toBeLessThan(json.indexOf('"partner-description"'));
    await fireEvent.press(screen.getByTestId('partner-email'));
    expect(openURL).toHaveBeenLastCalledWith('mailto:contact@wouri.test');
    await fireEvent.press(screen.getByTestId('partner-phone'));
    expect(openURL).toHaveBeenLastCalledWith('tel:+237670000002');

    // Sans coordonnées, rien.
    mockOne = { isPending: false, isError: false, error: null, data: wouri };
    await show(<PartnerDetailScreen id="3" />);
    expect(screen.queryByTestId('partner-contact')).toBeNull();
  });

  it('le slogan sous le nom (décision 2026-11-24-partenaire-slogan)', async () => {
    mockOne = { isPending: false, isError: false, error: null, data: { ...wouri, slogan: 'On porte, vous respirez.' } };
    await show(<PartnerDetailScreen id="3" />);

    expect(screen.getByTestId('partner-slogan')).toHaveTextContent('On porte, vous respirez.');
  });

  it('sans libellé, « Visiter le site » ; sans lien, pas de bouton', async () => {
    mockOne = { isPending: false, isError: false, error: null, data: { ...wouri, cta_label: null } };
    await show(<PartnerDetailScreen id="3" />);
    expect(screen.getByTestId('partner-cta-button')).toHaveTextContent('Visiter le site');

    mockOne = { isPending: false, isError: false, error: null, data: { ...wouri, url: null } };
    await show(<PartnerDetailScreen id="3" />);
    expect(screen.queryByTestId('partner-cta')).toBeNull();
  });

  it('un partenaire qui n’est plus visible : « plus disponible », sans « Réessayer »', async () => {
    mockOne = { isPending: false, isError: true, error: new ApiError(404, 'Not found') };
    await show(<PartnerDetailScreen id="3" />);

    expect(screen.getByTestId('partner-error')).toHaveTextContent("Ce partenaire n'est plus disponible.");
    expect(screen.queryByTestId('partner-retry')).toBeNull();
  });
});
