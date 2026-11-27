import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { SummaryLineRow } from '../components/SummaryLines';
import type { SummaryLine } from '../types';

async function renderLine(line: SummaryLine, onOpen = jest.fn()) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <SummaryLineRow line={line} onOpen={onOpen} testID="info" />
    </I18nContext.Provider>,
  );

  return onOpen;
}

describe('SummaryLineRow : un téléphone ou un e-mail masqué (décision 2026-11-27-email-telephone-masques)', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('affiche la valeur masquée et appelle le vrai numéro', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const onOpen = await renderLine({ key: 'phone', label: 'Téléphone', value: '+41 ••• 67', link: 'tel:+41791234567' });

    expect(screen.getByTestId('info-line-phone-value')).toHaveTextContent('+41 ••• 67');
    await fireEvent.press(screen.getByTestId('info-line-phone-value'));

    expect(openURL).toHaveBeenCalledWith('tel:+41791234567');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('écrit à la vraie adresse', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderLine({ key: 'email', label: 'E-mail', value: 'j•••@example.com', link: 'mailto:jeanne@example.com' });

    await fireEvent.press(screen.getByTestId('info-line-email-value'));

    expect(openURL).toHaveBeenCalledWith('mailto:jeanne@example.com');
  });

  it('un lien de l’app reste ouvert par l’app', async () => {
    const onOpen = await renderLine({ key: 'member', label: 'Membre', value: 'Awa', link: '/members/3' });

    await fireEvent.press(screen.getByTestId('info-line-member-value'));

    expect(onOpen).toHaveBeenCalledWith('/members/3');
  });
});
