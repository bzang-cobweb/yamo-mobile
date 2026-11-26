import { renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { Spacing } from '@/shared/theme/theme';

import { useSheetHeight } from '../useSheetHeight';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 62, right: 0, bottom: 34, left: 0 }) }));

describe('useSheetHeight (décision 2026-11-26-panneaux-taille-maximale)', () => {
  it('tout l’écran sous la barre d’état, moins une bande du fond assombri', async () => {
    const { result } = await renderHook(() => useSheetHeight());

    expect(result.current).toBe(Dimensions.get('window').height - 62 - Spacing.four);
  });
});
