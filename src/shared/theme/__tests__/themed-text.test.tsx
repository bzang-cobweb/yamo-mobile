import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ThemedText } from '../components/themed-text';
import { fontFamilyFor } from '../theme';

// Décision 2026-11-25-police-nunito : la police de l'app, le fichier de chaque graisse.
describe('police Nunito', () => {
  it('chaque graisse a son fichier, la plus proche sinon', () => {
    expect(fontFamilyFor(undefined)).toBe('Nunito_400Regular');
    expect(fontFamilyFor('normal')).toBe('Nunito_400Regular');
    expect(fontFamilyFor(500)).toBe('Nunito_500Medium');
    expect(fontFamilyFor('600')).toBe('Nunito_600SemiBold');
    expect(fontFamilyFor('bold')).toBe('Nunito_700Bold');
    expect(fontFamilyFor(900)).toBe('Nunito_800ExtraBold');
  });

  it('un texte prend le fichier de sa graisse, une graisse changée par le style aussi ; le code garde sa police', async () => {
    await render(
      <>
        <ThemedText testID="small">Petit</ThemedText>
        <ThemedText type="smallBold" testID="bold">
          Gras
        </ThemedText>
        <ThemedText style={{ fontWeight: '700' }} testID="styled">
          Gras par le style
        </ThemedText>
        <ThemedText type="code" testID="code">
          code
        </ThemedText>
      </>,
    );

    const family = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style).fontFamily;
    expect(family('small')).toBe('Nunito_500Medium');
    expect(family('bold')).toBe('Nunito_700Bold');
    expect(family('styled')).toBe('Nunito_700Bold');
    expect(family('code')).not.toMatch(/^Nunito/);
  });
});
