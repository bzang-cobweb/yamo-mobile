import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { Partner } from '../types';

/**
 * Le logo d'un partenaire dans son cadre ; sans logo, son nom au centre du cadre, sans fond (décision
 * 2026-11-23-partenaires-logos). Le même sur l'accueil, la liste et la fiche. `framed={false}` : sans bordure ni
 * marge, le logo prend toute la place du cadre (la page « Partenaires », décision 2026-11-24-partenaires-logos-sans-cadre).
 */
export function PartnerLogo({
  partner,
  size,
  framed = true,
  testID,
}: {
  partner: Pick<Partner, 'name' | 'logo'>;
  size: number;
  framed?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const outer = size + 2 * Spacing.two;
  const inner = framed ? size : outer;

  return (
    <View
      style={[styles.box, framed && styles.frame, { width: outer, height: outer }, framed && { borderColor: theme.backgroundSelected }]}
      testID={testID ? `${testID}-box` : undefined}>
      {partner.logo ? (
        <Image source={{ uri: partner.logo }} style={{ width: inner, height: inner }} contentFit="contain" accessible={false} testID={testID ? `${testID}-logo` : undefined} />
      ) : (
        <ThemedText type="smallBold" style={styles.name} numberOfLines={3}>
          {partner.name}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  frame: { borderRadius: 8, borderWidth: 1, padding: Spacing.two },
  name: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
});
