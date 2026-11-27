import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/hooks/use-theme';

const THUMB = 26;
const HEIGHT = 44;

/** Les décimales d'un incrément : 0,1 → 1 ; 0,25 → 2 ; 1 000 → 0. */
export function decimalsOf(step: number): number {
  return (String(step).split('.')[1] ?? '').length;
}

/** Une valeur dans ses bornes, sur un multiple de l'incrément depuis le minimum. */
export function snap(value: number, min: number, max: number, step: number): number {
  const steps = Math.round((Math.min(max, Math.max(min, value)) - min) / step);

  return Number(Math.min(max, min + steps * step).toFixed(decimalsOf(step)));
}

type Props = {
  /** Une poignée (une note) ou deux (un intervalle, la première au plus égale à la seconde) ; `null` : pas choisie. */
  values: (number | null)[];
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  /** La poignée déplacée (0 ou 1) et sa nouvelle valeur, déjà bornée par la voisine et calée sur l'incrément. */
  onChange: (index: number, value: number) => void;
  label: string;
  /** Ce que lit l'accessibilité, pour chaque poignée (« 3,2 sur 5 », « 50 000 ») ; absent : pas encore choisie. */
  valueTexts?: (string | undefined)[];
  /** Le nom lu de chaque poignée d'un intervalle (« Min », « Max »). */
  thumbLabels?: string[];
  testID: string;
};

/**
 * Le curseur commun des champs (décisions 2026-11-27-note-au-dixieme et 2026-11-27-intervalle-curseur) : une piste sur
 * toute la largeur, sa part remplie (jusqu'à la poignée, ou entre les deux), et une ou deux poignées. Un toucher bref
 * place la poignée la plus proche ; un glissement horizontal la déplace ; un glissement vertical reste au défilement du
 * formulaire. Le doigt est suivi sur l'écran : la piste est mesurée au toucher (le formulaire a pu défiler).
 * L'accessibilité règle chaque poignée d'un incrément à l'autre.
 */
export function Slider({ values, min, max, step, disabled, onChange, label, valueTexts = [], thumbLabels = [], testID }: Props) {
  const theme = useTheme();
  const track = useRef<ComponentRef<typeof View>>(null);
  const frame = useRef({ left: 0, width: 0 });
  const [width, setWidth] = useState(0);
  const latest = useRef({ values, onChange });
  latest.current = { values, onChange };
  const double = values.length === 2;

  /** La valeur de la poignée `index`, bornée par sa voisine et calée sur l'incrément. */
  function bounded(index: number, value: number): number {
    const [low, high] = latest.current.values;
    const floor = double && index === 1 ? (low ?? min) : min;
    const ceiling = double && index === 0 ? (high ?? max) : max;

    return snap(Math.min(ceiling, Math.max(floor, value)), min, max, step);
  }

  const responder = useMemo(() => {
    let moved = false;
    let active = 0;
    const at = (pageX: number) => {
      const { left, width: span } = frame.current;

      return span > 0 ? min + ((pageX - left) / span) * (max - min) : null;
    };
    // La poignée la plus proche du doigt ; à égalité, celle du côté où il va.
    const nearest = (value: number) => {
      if (!double) {
        return 0;
      }
      const [low, high] = latest.current.values;
      const lowAt = low ?? min;
      const highAt = high ?? max;

      return Math.abs(value - lowAt) < Math.abs(value - highAt) || (lowAt === highAt && value < lowAt) ? 0 : 1;
    };
    const move = (pageX: number) => {
      const value = at(pageX);
      if (value !== null) {
        latest.current.onChange(active, bounded(active, value));
      }
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_event, gesture) => !disabled && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      // Le défilement reprend le geste tant qu'il n'est pas devenu horizontal.
      onPanResponderTerminationRequest: () => !moved,
      onPanResponderGrant: (_event, gesture) => {
        moved = false;
        track.current?.measureInWindow((x, _y, span) => {
          frame.current = { left: x, width: span };
          const value = at(gesture.x0);
          active = value === null ? 0 : nearest(value);
        });
      },
      onPanResponderMove: (_event, gesture) => {
        if (moved || (Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy))) {
          moved = true;
          move(gesture.moveX);
        }
      },
      onPanResponderRelease: (_event, gesture) => {
        if (!moved && Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
          move(gesture.x0);
        }
      },
    });
    // `bounded` lit les valeurs à jour par `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, min, max, step, double]);

  const ratioOf = (value: number) => (value - min) / (max - min);
  const [first, second] = values;
  const from = double ? ratioOf(first ?? min) : 0;
  const to = double ? ratioOf(second ?? max) : first === null || first === undefined ? 0 : ratioOf(first);

  /** Ce que règle l'accessibilité sur la poignée `index`. */
  function adjust(index: number, action: string) {
    if (disabled) {
      return;
    }
    const current = values[index];
    // Pas choisie : une note part d'avant le minimum (« plus » donne le minimum) ; une poignée d'intervalle, de son bout.
    const base = current ?? (double ? (index === 0 ? min : max) : min - step);
    onChange(index, bounded(index, action === 'increment' ? base + step : base - step));
  }

  const accessibility = (index: number) => ({
    accessible: true,
    accessibilityRole: 'adjustable' as const,
    accessibilityState: { disabled },
    accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
    accessibilityValue: valueTexts[index] === undefined ? undefined : { min, max, now: values[index] ?? min, text: valueTexts[index] },
    onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => adjust(index, event.nativeEvent.actionName),
  });

  return (
    <View
      testID={testID}
      // Une poignée : le curseur entier se règle ; deux : chaque poignée.
      {...(double ? { accessibilityLabel: label } : { ...accessibility(0), accessibilityLabel: label })}
      style={[styles.slider, disabled && styles.disabled]}
      {...responder.panHandlers}>
      <View ref={track} collapsable={false} onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.filled, { left: width * from, width: width * (to - from), backgroundColor: theme.text }]} testID={`${testID}-filled`} />
      </View>
      {values.map((value, index) => (
        <View
          // Deux poignées : chacune réglable par l'accessibilité, le geste reste au curseur.
          {...(double ? { ...accessibility(index), accessibilityLabel: thumbLabels[index] ?? label } : {})}
          key={index}
          pointerEvents="none"
          style={[
            styles.thumb,
            { left: width * (double ? (index === 0 ? from : to) : to) - THUMB / 2, backgroundColor: theme.text, borderColor: theme.background },
            !double && value === null && styles.thumbEmpty,
          ]}
          testID={double ? `${testID}-thumb-${index === 0 ? 'min' : 'max'}` : `${testID}-thumb`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Assez haut pour le doigt ; la piste au milieu, sur toute la largeur du champ, sans marge (décision
  // 2026-11-27-curseur-sans-marge) : les poignées, centrées sur les bouts, débordent de moitié aux extrémités.
  slider: { height: HEIGHT, justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  track: { height: 4, borderRadius: 2 },
  filled: { position: 'absolute', top: 0, height: 4, borderRadius: 2 },
  thumb: { position: 'absolute', top: (HEIGHT - THUMB) / 2, width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderWidth: 3 },
  thumbEmpty: { opacity: 0.35 },
});
