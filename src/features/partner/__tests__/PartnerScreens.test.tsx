import { closeAuthSheet, isAuthSheetOpen } from '@/features/auth/components/AuthSheet';
import { Colors } from '@/shared/theme/theme';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, StyleSheet } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { PartnerDetailScreen } from '../screens/PartnerDetailScreen';
import { PartnerMembers } from '../components/PartnerMembers';
import { PartnerStatisticsPanel } from '../components/PartnerStatistics';
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

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
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

const wouri: Partner = { id: '3', name: 'Déménageurs du Wouri', description: 'Déménagement clés en main.', url: 'demenageurs-du-wouri', website: 'https://wouri.test/fr', cta_label: 'Demander un devis', logo: null };

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

    // Le logo sans bordure : la carte a déjà la sienne (décision 2026-11-24-partenaires-logos-sans-cadre).
    expect(StyleSheet.flatten(screen.getByTestId('partners-item-3-box').props.style).borderWidth).toBeUndefined();
    // Les coins arrondis restent.
    expect(StyleSheet.flatten(screen.getByTestId('partners-item-3-box').props.style).borderRadius).toBe(8);
    // Sans logo, l'emplacement reste vide : pas le nom (décision 2026-11-24-partenaires-cartes-sans-logo-vides).
    expect(within(screen.getByTestId('partners-item-3-box')).queryByText('Déménageurs du Wouri')).toBeNull();

    mockClick.mockClear();
    await fireEvent.press(screen.getByTestId('partners-item-4'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/partners/[id]', params: { id: '4' } });
    // La carte ne compte pas le clic : la page le fait (décision 2026-11-25-clic-a-l-ouverture).
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('« Devenir partenaire », servi par l’API : visiteur, la connexion ; connecté, le formulaire (décision 2026-11-24-devenir-partenaire)', async () => {
    mockList = { name: 'partner.all', title: 'Partenaires', search: null, empty: null, filters: [], items: [], footer: { label: 'Devenir partenaire', form: null, link: '/sign-in' } };
    await show(<PartnersScreen />);
    expect(screen.getByTestId('partners-footer')).toHaveTextContent('Devenir partenaire');
    await fireEvent.press(screen.getByText('Devenir partenaire'));
    // La connexion s'ouvre dans son panneau (décision 2026-11-28-app-connexion-panneau).
    expect(isAuthSheetOpen()).toBe(true);
    closeAuthSheet();

    mockList = { name: 'partner.all', title: 'Partenaires', search: null, empty: null, filters: [], items: [], footer: { label: 'Devenir partenaire', form: 'partner.partner', link: null } };
    await show(<PartnersScreen />);
    await fireEvent.press(screen.getByText('Devenir partenaire'));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/profile/[form]', params: { form: 'partner.partner' } });
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
    mockClick.mockClear();
    await show(<PartnerDetailScreen id="3" />);
    // Ouvrir sa page compte un clic, une fois (décision 2026-11-25-clic-a-l-ouverture).
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(mockClick).toHaveBeenCalledWith('3');

    expect(screen.getByTestId('partner-name')).toHaveTextContent('Déménageurs du Wouri');
    // Sans slogan, rien sous le nom.
    expect(screen.queryByTestId('partner-slogan')).toBeNull();
    expect(screen.getByTestId('partner-description')).toHaveTextContent('Déménagement clés en main.');
    // Un visiteur ne voit pas ses vues (décision 2026-11-25-partenaire-vues-sur-sa-page).
    expect(screen.queryByTestId('partner-views-row')).toBeNull();
    // En gris, comme un texte secondaire (décision 2026-11-24-partenaire-description-grise).
    expect(StyleSheet.flatten(screen.getByTestId('partner-description').props.style).color).toBe(Colors.light.textSecondary);
    expect(screen.getByTestId('partner-cta-button')).toHaveTextContent('Demander un devis');

    mockClick.mockClear();
    await fireEvent.press(screen.getByTestId('partner-cta-button'));
    // Le bouton du lien ne compte plus de clic (décision 2026-11-25-compteurs-partenaires).
    expect(mockClick).not.toHaveBeenCalled();
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://wouri.test/fr');
  });

  it('pour ses comptes, sa pastille centrée après le slogan, plus flottante ; sans, rien (décisions 2026-11-24-partenaire-page-statut et 2026-11-27-fiche-statut-apres-slogan)', async () => {
    mockOne = { isPending: false, isError: false, error: null, data: { ...wouri, slogan: 'On porte, vous respirez.', status: { label: 'En validation', tone: 'warning' } } };
    await show(<PartnerDetailScreen id="3" />);

    expect(screen.getByTestId('partner-status')).toHaveTextContent('En validation');
    expect(StyleSheet.flatten(screen.getByTestId('partner-status').props.style).position).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('partner-status').props.style).alignSelf).toBe('center');
    // Après le nom et le slogan (décision 2026-11-27-fiche-statut-apres-slogan).
    expect(screen.getAllByTestId(/^partner-(status|name|slogan)$/).map((node) => node.props.testID)).toEqual(['partner-name', 'partner-slogan', 'partner-status']);
  });

  it('un visiteur : pas de pastille', async () => {
    mockOne = { isPending: false, isError: false, error: null, data: wouri };
    await show(<PartnerDetailScreen id="3" />);

    expect(screen.queryByTestId('partner-status')).toBeNull();
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

  it('le logo s’il y en a un ; sans logo, pas de cadre (décision 2026-11-24-partenaire-page-sans-logo)', async () => {
    mockOne = { isPending: false, isError: false, error: null, data: { ...wouri, logo: 'https://api.test/logo.png' } };
    await show(<PartnerDetailScreen id="3" />);
    expect(screen.getByTestId('partner-logo')).toBeTruthy();
    // Sans bordure, coins arrondis (décision 2026-11-24-partenaire-logo-list-detail-inverses).
    expect(StyleSheet.flatten(screen.getByTestId('partner-box').props.style).borderWidth).toBeUndefined();

    mockOne = { isPending: false, isError: false, error: null, data: wouri };
    await show(<PartnerDetailScreen id="3" />);
    expect(screen.queryByTestId('partner-logo')).toBeNull();
    // Le nom n'est affiché qu'une fois : en titre, pas dans un cadre.
    expect(screen.getAllByText('Déménageurs du Wouri')).toHaveLength(2);
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

    mockOne = { isPending: false, isError: false, error: null, data: { ...wouri, website: null } };
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

describe('PartnerDetailScreen : ni vues ni membres (décision 2026-11-27-fiche-sans-vues-membres)', () => {
  it('pour ses comptes, la fiche ne montre ni ses vues ni ses membres, même servis ; ni œil ni ligne', async () => {
    const member = { id: '7', name: 'Awa', initials: 'A', photo: null, online: false, link: '/members/7', email: null, phone: null, is_admin: true, can_change_admin: false, can_remove: false, tag: null };
    mockOne = { isPending: false, isError: false, error: null, data: { ...wouri, contact_email: 'contact@wouri.test', views: { count: 12, label: '12 vues' }, clicks: { count: 3, label: '3 clics' }, members_label: '1 membre', members: [member] } };
    await show(<PartnerDetailScreen id="3" />);

    expect(screen.getByTestId('partner-contact')).toBeTruthy();
    expect(screen.queryByTestId('partner-views')).toBeNull();
    expect(screen.queryByTestId('partner-views-row')).toBeNull();
    expect(screen.queryByTestId('partner-members-row')).toBeNull();
    expect(screen.queryByText('12')).toBeNull();
  });
});

describe('les membres d’un partenaire, le contenu du panneau « Membres » (décisions 2026-11-27-mes-partenaires-membres et 2026-11-27-membres-en-panneau)', () => {
  it('le nombre de ses comptes, puis chacun, l’administrateur marqué ; sans compter de clic', async () => {
    mockClick.mockClear();
    mockOne = {
      isPending: false,
      isError: false,
      error: null,
      data: {
        ...wouri,
        members_label: '2 membres',
        members: [
          { id: '7', name: 'Awa', initials: 'A', photo: null, online: true, link: '/members/7', email: null, phone: null, is_admin: true, can_change_admin: false, can_remove: false, tag: { label: 'Administrateur', tone: 'success' } },
          { id: '9', name: 'Bruno', initials: 'B', photo: null, online: false, link: '/members/9', email: null, phone: null, is_admin: false, can_change_admin: false, can_remove: false, tag: null },
        ],
      },
    };
    await show(<PartnerMembers id="3" />);

    expect(screen.getByTestId('partner-members-count')).toHaveTextContent('2 membres');
    expect(screen.getByTestId('partner-member-7-tag')).toHaveTextContent('Administrateur');
    expect(screen.getByTestId('partner-member-9-name')).toHaveTextContent('Bruno');
    expect(mockClick).not.toHaveBeenCalled();
    // La photo bordée : verte en ligne, discrète sinon (décision 2026-11-27-membres-photo-en-ligne).
    expect(StyleSheet.flatten(screen.getByTestId('partner-member-7-photo').props.style)).toMatchObject({ borderWidth: 2, borderColor: '#2E9D5B' });
    expect(StyleSheet.flatten(screen.getByTestId('partner-member-9-photo').props.style).borderColor).not.toBe('#2E9D5B');
  });

  it('la recherche, sans accents ni majuscules, dans le nom, l’e-mail et le téléphone ; rien trouvé : « Aucun membre trouvé. » (décision 2026-11-27-membres-recherche)', async () => {
    mockOne = {
      isPending: false,
      isError: false,
      error: null,
      data: {
        ...wouri,
        members_label: '3 membres',
        members: [
          { id: '7', name: 'Zoé', initials: 'Z', photo: null, online: false, link: '/members/7', email: null, phone: null, is_admin: false, can_change_admin: false, can_remove: false, tag: null },
          { id: '8', name: 'Bruno', initials: 'B', photo: null, online: false, link: '/members/8', email: 'bruno@exemple.test', phone: null, is_admin: false, can_change_admin: false, can_remove: false, tag: null },
          { id: '9', name: 'Chloé', initials: 'C', photo: null, online: false, link: '/members/9', email: null, phone: '+237 6 99 00 11 22', is_admin: false, can_change_admin: false, can_remove: false, tag: null },
        ],
      },
    };
    await show(<PartnerMembers id="3" />);

    const search = screen.getByTestId('partner-members-search');
    expect(search.props.placeholder).toBe('Rechercher un membre');
    await fireEvent.changeText(search, 'ZOE');
    expect(screen.getByTestId('partner-member-7')).toBeTruthy();
    expect(screen.queryByTestId('partner-member-8')).toBeNull();
    await fireEvent.changeText(search, 'exemple.test');
    expect(screen.getByTestId('partner-member-8')).toBeTruthy();
    expect(screen.queryByTestId('partner-member-7')).toBeNull();
    await fireEvent.changeText(search, '99 00');
    expect(screen.getByTestId('partner-member-9')).toBeTruthy();
    await fireEvent.changeText(search, 'personne');
    expect(screen.getByTestId('partner-members-empty')).toHaveTextContent('Aucun membre trouvé.');
    // Le nombre de comptes reste celui du partenaire.
    expect(screen.getByTestId('partner-members-count')).toHaveTextContent('3 membres');
    await fireEvent.changeText(search, '');
    expect(screen.getAllByTestId(/^partner-member-\d+$/)).toHaveLength(3);
  });
});

describe('le panneau « Statistiques » de « Mes partenaires » (décision 2026-11-27-mes-partenaires-statistiques)', () => {
  it('lit le partenaire, puis le tableau des vues et des clics', async () => {
    mockOne = { isPending: false, isError: false, error: null, data: { ...wouri, views: { count: 12, label: '12 vues' }, clicks: { count: 0, label: '0 clic' } } };
    await show(<PartnerStatisticsPanel id="3" />);

    expect(screen.getByTestId('partner-statistics-views')).toHaveTextContent('Vues12');
    expect(screen.getByTestId('partner-statistics-clicks')).toHaveTextContent('Clics0');
  });
});
