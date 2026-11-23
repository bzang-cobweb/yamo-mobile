import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { Partner } from '../types';

/**
 * Le logo d'un partenaire dans son cadre ; sans logo, son nom au centre du cadre, sans fond (décision
 * 2026-11-23-partenaires-logos). Le même sur l'accueil, la liste et la fiche.
 */
export function PartnerLogo({ partner, size, testID }: { partner: Pick<Partner, 'name' | 'logo'>; size: number; testID?: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.frame, { width: size + 2 * Spacing.two, height: size + 2 * Spacing.two, borderColor: theme.backgroundSelected }]}>
      {partner.logo ? (
        <Image source={{ uri: partner.logo }} style={{ width: size, height: size }} contentFit="contain" accessible={false} testID={testID ? `${testID}-logo` : undefined} />
      ) : (
        <ThemedText type="smallBold" style={styles.name} numberOfLines={3}>
          {partner.name}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 8, borderWidth: 1, padding: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
});
