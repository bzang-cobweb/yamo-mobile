import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet, Text } from 'react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { BottomSheet, SHEET_COLUMN_FROM } from '../BottomSheet';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 62, right: 0, bottom: 34, left: 0 }),
}));

async function show(props: { fitContent?: boolean; onClose?: () => void } = {}) {
  const onClose = props.onClose ?? jest.fn();
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <BottomSheet visible title="Filtres" onClose={onClose} fitContent={props.fitContent} overlay={<Text testID="overlay">Bandeau</Text>} testID="sheet">
        <Text testID="body">Contenu</Text>
      </BottomSheet>
    </I18nContext.Provider>,
  );

  return onClose;
}

describe('BottomSheet (décision 2026-11-26-bottom-sheet)', () => {
  it('par défaut, à sa taille maximale : toute la fenêtre sous une bande en haut, le contenu remplit la place', async () => {
    await show();

    expect(StyleSheet.flatten(screen.getByTestId('sheet').props.style)).toMatchObject({ flex: 1, paddingBottom: 34, borderTopLeftRadius: 20 });
    // Un écran d'au moins 600 points (750 dans les tests) : une colonne centrée, de la largeur du contenu des écrans
    // (décision 2026-11-26-sheet-bar).
    expect(Dimensions.get('window').width).toBeGreaterThanOrEqual(SHEET_COLUMN_FROM);
    expect(StyleSheet.flatten(screen.getByTestId('sheet').props.style)).toMatchObject({ width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center' });
    expect(StyleSheet.flatten(screen.getByTestId('sheet-content').props.style)).toMatchObject({ flex: 1 });
    expect(screen.getByTestId('body')).toHaveTextContent('Contenu');
    expect(screen.getByTestId('overlay')).toBeTruthy();
    expect(screen.getByText('Filtres')).toBeTruthy();
  });

  it('à la taille du contenu, jusqu’à la taille maximale', async () => {
    await show({ fitContent: true });

    const style = StyleSheet.flatten(screen.getByTestId('sheet').props.style);
    expect(style).toMatchObject({ marginTop: 'auto', flexShrink: 1 });
    expect(style.flex).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('sheet-content').props.style)).toMatchObject({ flexShrink: 1 });
  });

  it('une bande du fond en haut : la barre d’état et une marge', async () => {
    await show();

    expect(StyleSheet.flatten(screen.getByTestId('sheet').parent?.props.style)).toMatchObject({ paddingTop: 62 + Spacing.four });
  });

  it('la croix et le fond ferment le panneau', async () => {
    const onClose = await show();

    await fireEvent.press(screen.getByTestId('sheet-close'));
    await fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
