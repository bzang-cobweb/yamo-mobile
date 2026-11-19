import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

type Props = {
  /** Le titre de la section, toujours visible ; le toucher ouvre ou ferme la section. */
  title: string;
  /** Ouverte au premier affichage (par défaut : oui). */
  initiallyOpen?: boolean;
  /** Préfixe des identifiants de test : `<testID>-toggle`, `<testID>-content`. */
  testID?: string;
  children: ReactNode;
};

/**
 * Une section repliable (décision 2026-11-19-fiche-localisation-accordeon) : un
 * titre et une flèche ; le contenu s'affiche ou se replie au toucher du titre.
 * Chaque section s'ouvre et se ferme seule, indépendamment des autres.
 */
export function Accordion({ title, initiallyOpen = true, testID, children }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <View style={styles.section} testID={testID}>
      <Pressable
        testID={testID ? `${testID}-toggle` : undefined}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={Spacing.one}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <SymbolView
          name={open ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          size={14}
          tintColor={theme.textSecondary}
        />
      </Pressable>
      {open && (
        <View style={styles.content} testID={testID ? `${testID}-content` : undefined}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingVertical: Spacing.one },
  content: { gap: Spacing.one, marginTop: Spacing.one },
  pressed: { opacity: 0.6 },
});
