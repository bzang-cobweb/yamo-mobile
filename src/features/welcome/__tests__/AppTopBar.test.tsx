import { render, screen } from '@testing-library/react-native';

import { AppTopBar } from '../components/AppTopBar';

jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
});

describe('AppTopBar', () => {
  it('affiche toujours le mot YaMo, sans appeler l’API', async () => {
    await render(<AppTopBar />);

    const logo = screen.getByTestId('app-top-bar-logo');
    expect(logo.props.accessibilityLabel).toBe('YaMo');
    expect(logo.props.style).toEqual(expect.arrayContaining([{ height: 24, width: 84 }]));
  });
});
