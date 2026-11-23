import { fireEvent, render, screen } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { PartnersStrip } from '../components/PartnersStrip';
import type { Partner } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
const mockClick = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/PartnerService', () => ({ partnerService: { click: (...args: unknown[]) => mockClick(...args) } }));

const wouri: Partner = {
  id: '3',
  name: 'Déménageurs du Wouri',
  description: 'Déménagement clés en main.',
  url: 'https://wouri.test/fr',
  cta_label: 'Demander un devis',
  logo: null,
};

async function show(partners: Partner[]) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <PartnersStrip partners={partners} cardWidth={170} />
    </I18nContext.Provider>,
  );
}

// Décision 2026-11-23-module-partenaires.
describe('PartnersStrip', () => {
  it('le titre, puis une carte par partenaire : nom, description, bouton', async () => {
    await show([wouri]);

    expect(screen.getByTestId('home-partners')).toHaveTextContent(/^Partenaires/);
    expect(screen.getByTestId('home-partner-3')).toHaveTextContent(/Déménageurs du Wouri.*Déménagement clés en main\..*Demander un devis/);
  });

  it('un toucher compte un clic et ouvre le lien dans le navigateur de l’app', async () => {
    await show([wouri]);

    await fireEvent.press(screen.getByTestId('home-partner-3'));

    expect(mockClick).toHaveBeenCalledWith('3');
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://wouri.test/fr');
  });

  it('sans partenaire, rien', async () => {
    await show([]);

    expect(screen.queryByTestId('home-partners')).toBeNull();
  });
});
