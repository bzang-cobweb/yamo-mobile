import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentRef, type PropsWithChildren, type ReactNode } from 'react';
import { Keyboard, LayoutAnimation, Platform, ScrollView, StyleSheet, View, type KeyboardEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

/** Une vue affichée (un champ) : ce que `reveal` sait atteindre. */
export type RevealTarget = ComponentRef<typeof View>;

type FixedFooter = {
  /** Place (ou retire, avec `null`) le contenu de la barre de `id` ; le dernier placé est affiché. */
  set: (id: string, node: ReactNode | null) => void;
  /** Fait défiler jusqu'à cette vue (un champ en erreur). */
  reveal: (target: RevealTarget | null) => void;
};

const FixedFooterContext = createContext<FixedFooter | null>(null);

/** La barre fixe de l'écran, s'il en a une ; `null` sinon (le formulaire garde son bouton dans la page). */
export function useFixedFooter(): FixedFooter | null {
  return useContext(FixedFooterContext);
}

type Props = PropsWithChildren<{
  /** Style du contenu qui défile (marges, largeur, espacement). */
  contentStyle?: StyleProp<ViewStyle>;
  /** Ajouter la marge du bas de l'écran (barre d'accueil) sous la barre : quand l'écran ne la prend pas déjà. */
  bottomInset?: boolean;
  /**
   * Vrai : la mise en page prend la hauteur de son contenu (dans un panneau à la taille du contenu), et ne défile que
   * si elle dépasse la place donnée ; faux (par défaut) : elle remplit la place (`flex: 1`).
   */
  fit?: boolean;
  testID?: string;
}>;

/**
 * Le contenu défile au-dessus d'une barre fixe en bas (décision
 * 2026-11-19-contrat-bouton-fixe-formulaires) : un formulaire y place son bouton
 * d'envoi (`useFixedFooter`). Plusieurs formulaires montés (le formulaire caché et
 * l'étape du code) : le dernier affiché tient la barre ; il la rend en partant.
 * Clavier ouvert, la barre remonte juste au-dessus (sans `KeyboardAvoidingView`, qui
 * mesure mal sa place sous un en-tête ou dans un onglet).
 */
export function FixedFooterLayout({ contentStyle, bottomInset = false, fit = false, testID, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<[string, ReactNode][]>([]);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const content = useRef<RevealTarget>(null);
  const frame = useRef<RevealTarget>(null);
  // Clavier ouvert : de combien il recouvre le bas de la mise en page. La barre remonte
  // d'autant, posée sur le clavier, sans la marge du bas de l'écran. La mesure se fait
  // sur l'écran (et non dans le parent), juste dans un onglet comme dans une pile.
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (event) => {
      frame.current?.measureInWindow((_x: number, y: number, _width: number, height: number) => {
        followKeyboard(event);
        setLift(Math.max(0, y + height - event.endCoordinates.screenY));
      });
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', (event) => {
      followKeyboard(event);
      setLift(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const set = useCallback((id: string, node: ReactNode | null) => {
    setEntries((current) => {
      const at = current.findIndex(([key]) => key === id);
      if (node === null) {
        return at < 0 ? current : current.filter(([key]) => key !== id);
      }
      if (at < 0) {
        return [...current, [id, node]];
      }
      const next = [...current];
      next[at] = [id, node];

      return next;
    });
  }, []);

  const reveal = useCallback((target: RevealTarget | null) => {
    if (target === null || content.current === null) {
      return;
    }
    target.measureLayout(
      content.current,
      (_x: number, y: number) => scroll.current?.scrollTo({ y: Math.max(0, y - Spacing.four), animated: true }),
      () => undefined,
    );
  }, []);

  const value = useMemo(() => ({ set, reveal }), [set, reveal]);
  const footer = entries.at(-1)?.[1];

  return (
    <FixedFooterContext.Provider value={value}>
      <View ref={frame} collapsable={false} style={[fit ? styles.frameFit : styles.frame, { paddingBottom: lift }]}>
        <ScrollView
          ref={scroll}
          style={fit ? styles.scrollFit : undefined}
          contentContainerStyle={fit ? undefined : styles.scroll}
          keyboardShouldPersistTaps="handled"
          testID={testID}>
          <View ref={content} collapsable={false} style={[styles.grow, contentStyle]}>
            {children}
          </View>
        </ScrollView>
        {footer !== undefined && (
          <View
            testID="fixed-footer"
            style={[
              styles.bar,
              { borderTopColor: theme.backgroundSelected, backgroundColor: theme.background },
              bottomInset && lift === 0 && { paddingBottom: Math.max(insets.bottom, Spacing.three) },
            ]}>
            <View style={[styles.barContent, contentWidth(contentStyle)]}>{footer}</View>
          </View>
        )}
      </View>
    </FixedFooterContext.Provider>
  );
}

/**
 * La barre monte et descend avec le clavier, au même rythme, au lieu de sauter :
 * sans cela, à la fermeture elle retombe derrière le clavier qui descend encore et
 * ne réapparaît qu'une fois celui-ci parti.
 */
function followKeyboard(event: KeyboardEvent) {
  if (Platform.OS !== 'ios' || !event.duration) {
    return;
  }
  LayoutAnimation.configureNext({
    duration: event.duration,
    update: { duration: event.duration, type: LayoutAnimation.Types[event.easing] ?? LayoutAnimation.Types.keyboard },
  });
}

/** La barre suit la largeur maximale du contenu (centrée sur tablette). */
function contentWidth(style: StyleProp<ViewStyle>): ViewStyle {
  const flat = StyleSheet.flatten(style) ?? {};

  return { maxWidth: flat.maxWidth, width: '100%', alignSelf: 'center' };
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  // À la taille du contenu : rétrécit seulement quand il dépasse ; la zone qui défile aussi, la barre restant visible.
  frameFit: { flexShrink: 1 },
  scrollFit: { flexGrow: 0, flexShrink: 1 },
  scroll: { flexGrow: 1 },
  grow: { flexGrow: 1 },
  bar: { borderTopWidth: 1, paddingTop: Spacing.three, paddingBottom: Spacing.three },
  barContent: { paddingHorizontal: Spacing.four, gap: Spacing.two },
});
