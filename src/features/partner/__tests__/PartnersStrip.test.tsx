import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { closeAuthSheet, isAuthSheetOpen } from '@/features/auth/components/AuthSheet';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { PartnersStrip } from '../components/PartnersStrip';
import type { Partner, PartnerBecome } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
const mockClick = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/PartnerService', () => ({ partnerService: { click: (...args: unknown[]) => mockClick(...args) } }));

const wouri: Partner = {
  id: '3',
  name: 'Déménageurs du Wouri',
  description: 'Déménagement clés en main.',
  url: 'demenageurs-du-wouri',
  website: 'https://wouri.test/fr',
  cta_label: 'Demander un devis',
  logo: null,
};

async function show(partners: Partner[], become: PartnerBecome | null = null) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <PartnersStrip partners={partners} become={become} />
    </I18nContext.Provider>,
  );
}

// Décision 2026-11-23-module-partenaires.
describe('PartnersStrip', () => {
  it('le titre, puis le logo de chaque partenaire, son nom lu par les lecteurs d’écran (décision 2026-11-23-partenaires-logos)', async () => {
    await show([{ ...wouri, logo: 'https://api.test/logo.png' }, { ...wouri, id: '4', name: 'Assurances du Littoral', logo: null }]);

    expect(screen.getByTestId('home-partners')).toHaveTextContent(/^Partenaires/);
    expect(screen.getByTestId('home-partner-3-logo')).toBeTruthy();
    // Sans bordure (décision 2026-11-24-partenaires-logos-sans-cadre).
    expect(StyleSheet.flatten(screen.getByTestId('home-partner-3-box').props.style).borderWidth).toBeUndefined();
    // Les coins arrondis restent.
    expect(StyleSheet.flatten(screen.getByTestId('home-partner-3-box').props.style).borderRadius).toBe(8);
    // Ni description ni bouton : le logo suffit.
    expect(screen.getByTestId('home-partner-3')).not.toHaveTextContent(/Déménagement|Demander un devis/);
    expect(screen.getByLabelText('Déménageurs du Wouri')).toBeTruthy();
    // Sans logo, le nom à sa place.
    expect(screen.getByTestId('home-partner-4')).toHaveTextContent('Assurances du Littoral');
  });

  it('toucher un logo ouvre la page du partenaire ; la flèche, la page « Partenaires » (décision 2026-11-23-partenaires-liste-detail)', async () => {
    await show([wouri]);

    await fireEvent.press(screen.getByTestId('home-partner-3'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/partners/[id]', params: { id: '3' } });
    // Le logo ne compte pas le clic : la page le fait (décision 2026-11-25-clic-a-l-ouverture).
    expect(mockClick).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('home-partners-see-all'));
    expect(router.push).toHaveBeenLastCalledWith('/partners');
  });

  it('au bout du carrousel, la carte « Devenir partenaire » : visiteur, la connexion ; connecté, le formulaire (décision 2026-11-25-accueil-carte-devenir-partenaire)', async () => {
    await show([wouri], { label: 'Devenir partenaire', form: null, link: '/sign-in' });

    await fireEvent.press(screen.getByTestId('home-partners-become'));
    expect(screen.getByTestId('home-partners-become')).toHaveTextContent('Devenir partenaire');
    // La connexion s'ouvre dans son panneau (décision 2026-11-28-app-connexion-panneau).
    expect(isAuthSheetOpen()).toBe(true);
    closeAuthSheet();

    await show([wouri], { label: 'Devenir partenaire', form: 'partner.form', link: null });
    await fireEvent.press(screen.getByTestId('home-partners-become'));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/profile/[form]', params: { form: 'partner.form' } });
  });

  it('sans partenaire, la carte « Devenir partenaire » seule', async () => {
    await show([], { label: 'Devenir partenaire', form: null, link: '/sign-in' });

    expect(screen.getByTestId('home-partners')).toBeTruthy();
    expect(screen.getByTestId('home-partners-become')).toBeTruthy();
  });

  it('sans partenaire ni carte, rien', async () => {
    await show([]);

    expect(screen.queryByTestId('home-partners')).toBeNull();
  });
});
