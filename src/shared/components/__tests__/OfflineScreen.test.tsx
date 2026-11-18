import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { translate } from '@/shared/i18n/locale';

import { OfflineScreen } from '../OfflineScreen';

describe('OfflineScreen', () => {
  it("affiche le message et le bouton locaux, sans aucun texte de l'API", async () => {
    const onRetry = jest.fn();
    await render(
      <I18nContext.Provider value={{ locale: 'en', t: (key, params) => translate({}, 'en', key, params), chooseLocale: () => undefined, localeChosen: true }}>
        <OfflineScreen onRetry={onRetry} retrying={false} />
      </I18nContext.Provider>,
    );

    expect(screen.getByTestId('offline-message')).toHaveTextContent(/^Can't connect/);
    expect(screen.getByTestId('offline-logo').props.accessibilityLabel).toBe('YaMo');
    await fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('montre un indicateur pendant la nouvelle tentative', async () => {
    await render(<OfflineScreen onRetry={jest.fn()} retrying />);

    expect(screen.getByTestId('offline-retry')).toBeDisabled();
  });
});
