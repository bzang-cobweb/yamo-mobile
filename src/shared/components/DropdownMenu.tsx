import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ERROR_COLOR } from '@/shared/theme/colors';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

export type DropdownMenuEntry = {
  key: string;
  label: string;
  /** Une action qui retire ou détruit : en rouge. */
  danger?: boolean;
  onPress: () => void;
};

type Props = {
  entries: DropdownMenuEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ce que lit l'accessibilité sur le bouton (« Actions Studio »). */
  accessibilityLabel: string;
  /** Sa place : en haut à droite d'une carte, dans un en-tête. */
  style?: StyleProp<ViewStyle>;
  testID: string;
};

/**
 * Le menu « ⋮ » commun (décisions 2026-11-21-menu-trois-points, 2026-11-21-menu-flottant et
 * 2026-11-27-notification-menu-info) : un seul bouton, trois petits points verticaux sur une pastille ronde lisible sur
 * n'importe quel fond ; ouvert, ses entrées flottent dessous, alignées à droite. Toucher une entrée ferme le menu puis
 * l'exécute. Les cartes d'une liste et la page d'une notification s'en servent.
 */
export function DropdownMenu({ entries, open, onOpenChange, accessibilityLabel, style, testID }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.menu, style]} testID={testID}>
      <Pressable
        testID={`${testID}-toggle`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={accessibilityLabel}
        hitSlop={Spacing.one}
        onPress={() => onOpenChange(!open)}
        style={({ pressed }) => [styles.toggle, { backgroundColor: theme.background, shadowColor: theme.text }, pressed && styles.pressed]}>
        <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={20} tintColor={theme.text} style={styles.vertical} />
      </Pressable>
      {open && (
        <View style={[styles.list, { borderColor: theme.backgroundSelected, backgroundColor: theme.background, shadowColor: theme.text }]} testID={`${testID}-list`}>
          {entries.map((entry) => (
            <Pressable
              key={entry.key}
              testID={`${testID}-${entry.key}`}
              accessibilityRole="button"
              onPress={() => {
                onOpenChange(false);
                entry.onPress();
              }}
              style={({ pressed }) => [styles.entry, pressed && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" style={entry.danger ? styles.danger : undefined}>
                {entry.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: { alignItems: 'flex-end', zIndex: 2 },
  // Une pastille ronde, pour rester lisible sur n'importe quelle photo.
  toggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  // Trois points verticaux : l'icône « ellipsis » d'iOS, tournée d'un quart de tour.
  vertical: { transform: [{ rotate: '90deg' }] },
  list: {
    position: 'absolute',
    right: 0,
    top: 40,
    minWidth: 180,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  entry: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  danger: { color: ERROR_COLOR },
  pressed: { opacity: 0.6 },
});
