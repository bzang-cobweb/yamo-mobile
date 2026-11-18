import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/hooks/use-theme';

/**
 * Photo d'un item de liste, au-dessus de son titre (décision
 * 2026-11-18-liste-photo-barre-connecte), au format 16:9. Sans photo : un
 * emplacement neutre avec une icône, si `placeholder` le demande ; sinon rien.
 */
export function ItemPhoto({ uri, placeholder = false, testID }: { uri: string | null; placeholder?: boolean; testID?: string }) {
  const theme = useTheme();

  if (uri) {
    return <Image source={{ uri }} style={styles.photo} contentFit="cover" transition={150} accessibilityIgnoresInvertColors testID={testID} />;
  }

  if (!placeholder) {
    return null;
  }

  return (
    <View style={[styles.photo, styles.empty, { backgroundColor: theme.backgroundElement }]} testID={testID ? `${testID}-empty` : undefined}>
      <SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={28} tintColor={theme.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: 6 },
  empty: { alignItems: 'center', justifyContent: 'center' },
});
