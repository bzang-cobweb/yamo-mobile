import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

/** L'action de la zone fixe du bas : le prix et le bouton « Réserver ». */
export type GalleryAction = { label: string; price: string | null; onPress: () => void };

/** Le côté d'une miniature, en points. */
const THUMB = 56;

/** La place du carrousel des miniatures sous la photo : son espace au-dessus et sa hauteur. */
const STRIP_SPACE = Spacing.three + THUMB;

/** La place de la barre du haut (fermer, position), que la photo ne recouvre pas. */
const HEADER = 36 + 2 * Spacing.two;

/** Les proportions d'une photo pas encore chargée : celles du carrousel de la fiche. */
const DEFAULT_RATIO = 16 / 9;

/**
 * Les photos d'une offre en plein écran (décision 2026-11-25-galerie-plein-ecran) : fond noir, photo entière,
 * défilement horizontal à partir de `initialIndex`, position « 2 / 5 », bouton de fermeture ; sur iOS, on zoome en
 * pinçant. Juste sous la photo, le carrousel des miniatures (`thumbnails`, sinon `photos`) : toucher une miniature
 * affiche sa photo, celle affichée est encadrée ; la photo et ses miniatures sont centrées ensemble. En bas, une zone
 * fixe avec le prix et le bouton « Réserver » (`action`). `onClose` reçoit la dernière photo vue.
 */
export function PhotoGallery({
  photos,
  thumbnails,
  initialIndex,
  visible,
  onClose,
  action,
}: {
  photos: string[];
  thumbnails?: string[];
  initialIndex: number;
  visible: boolean;
  onClose: (index: number) => void;
  action?: GalleryAction | null;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const list = useRef<ComponentRef<typeof FlatList<string>>>(null);
  const strip = useRef<ComponentRef<typeof FlatList<string>>>(null);
  // L'action à lancer une fois la galerie fermée : iOS ne pousse pas un écran sous une fenêtre qui se ferme.
  const pending = useRef<(() => void) | null>(null);
  const small = thumbnails && thumbnails.length === photos.length ? thumbnails : photos;
  const withStrip = photos.length > 1;
  const [index, setIndex] = useState(initialIndex);
  const [opened, setOpened] = useState(initialIndex);
  // La hauteur de la zone des photos, entre le haut de l'écran et la zone fixe du bas.
  const [area, setArea] = useState(height);
  // Les proportions de chaque photo chargée (largeur / hauteur).
  const [ratios, setRatios] = useState<Record<string, number>>({});

  // Rouverte sur une autre photo : la position repart de celle-ci.
  if (visible && opened !== initialIndex) {
    setOpened(initialIndex);
    setIndex(initialIndex);
  }

  /** La hauteur de la photo `uri` affichée entière, et son haut : la photo et les miniatures centrées ensemble. */
  function frame(uri: string | undefined): { height: number; top: number } {
    const available = Math.max(0, area - insets.top - HEADER - (withStrip ? STRIP_SPACE : 0));
    const shown = Math.min(available, width / (uri ? (ratios[uri] ?? DEFAULT_RATIO) : DEFAULT_RATIO));

    return { height: shown, top: insets.top + HEADER + (available - shown) / 2 };
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
    setIndex(Math.min(Math.max(page, 0), photos.length - 1));
  }

  function show(position: number) {
    setIndex(position);
    list.current?.scrollToIndex({ index: position, animated: true });
  }

  // La miniature de la photo affichée reste visible, centrée.
  useEffect(() => {
    if (visible && withStrip) {
      strip.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }, [index, visible, withStrip]);

  function close() {
    onClose(index);
  }

  function act() {
    if (!action) {
      return;
    }
    if (Platform.OS === 'ios') {
      pending.current = action.onPress;
      close();

      return;
    }
    close();
    action.onPress();
  }

  function onDismiss() {
    const run = pending.current;
    pending.current = null;
    run?.();
  }

  const current = frame(photos[index]);

  return (
    <Modal
      testID="offer-gallery-modal"
      visible={visible}
      animationType="fade"
      onRequestClose={close}
      onDismiss={onDismiss}
      supportedOrientations={['portrait', 'landscape']}
      statusBarTranslucent>
      <View style={styles.backdrop} testID="offer-gallery">
        <View style={styles.area} onLayout={(event) => setArea(event.nativeEvent.layout.height)}>
          <FlatList
            ref={list}
            // Une nouvelle ouverture repart de la photo touchée.
            key={`${initialIndex}-${width}`}
            testID="offer-gallery-list"
            data={photos}
            keyExtractor={(uri) => uri}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(initialIndex, Math.max(photos.length - 1, 0))}
            getItemLayout={(_, position) => ({ length: width, offset: width * position, index: position })}
            onMomentumScrollEnd={onScrollEnd}
            renderItem={({ item, index: position }) => {
              const page = frame(item);

              return (
                // Sur iOS, la page se zoome en pinçant ; Android ne zoome pas une ScrollView.
                <ScrollView
                  style={{ width, height: area }}
                  maximumZoomScale={Platform.OS === 'ios' ? 3 : 1}
                  minimumZoomScale={1}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}>
                  <Image
                    testID={`offer-gallery-photo-${position}`}
                    source={{ uri: item }}
                    style={{ width, height: page.height, marginTop: page.top }}
                    contentFit="contain"
                    onLoad={(event) => {
                      const { width: w, height: h } = event.source;
                      if (w > 0 && h > 0 && ratios[item] !== w / h) {
                        setRatios((known) => ({ ...known, [item]: w / h }));
                      }
                    }}
                    accessibilityIgnoresInvertColors
                  />
                </ScrollView>
              );
            }}
          />
          {withStrip && (
            <FlatList
              ref={strip}
              testID="offer-gallery-thumbnails"
              data={small}
              keyExtractor={(uri) => uri}
              horizontal
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, position) => ({ length: THUMB + Spacing.two, offset: (THUMB + Spacing.two) * position, index: position })}
              // Juste sous la photo affichée.
              style={[styles.strip, { top: current.top + current.height + Spacing.three }]}
              contentContainerStyle={styles.stripContent}
              renderItem={({ item, index: position }) => (
                <Pressable
                  accessibilityRole="imagebutton"
                  accessibilityLabel={t('offer.photoPosition', { current: position + 1, total: photos.length })}
                  accessibilityState={{ selected: position === index }}
                  testID={`offer-gallery-thumbnail-${position}`}
                  onPress={() => show(position)}
                  style={[styles.thumb, position === index ? styles.thumbCurrent : styles.thumbOther]}>
                  <Image source={{ uri: item }} style={styles.thumbImage} contentFit="cover" accessibilityIgnoresInvertColors />
                </Pressable>
              )}
            />
          )}
        </View>
        {action && (
          <View
            testID="offer-gallery-action-bar"
            style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Spacing.three), paddingLeft: insets.left + Spacing.four, paddingRight: insets.right + Spacing.four }]}>
            <View style={styles.barPrice}>
              {action.price && (
                <ThemedText type="smallBold" style={styles.white} testID="offer-gallery-price">
                  {action.price}
                </ThemedText>
              )}
            </View>
            <Pressable
              testID="offer-gallery-action"
              accessibilityRole="button"
              onPress={act}
              style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                {action.label}
              </ThemedText>
            </Pressable>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nav.close')}
          testID="offer-gallery-close"
          hitSlop={12}
          onPress={close}
          style={[styles.close, { top: insets.top + Spacing.two, left: insets.left + Spacing.three }]}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} tintColor="#ffffff" size={20} />
        </Pressable>
        {withStrip && (
          <View style={[styles.position, { top: insets.top + Spacing.two, right: insets.right + Spacing.three }]}>
            <ThemedText type="small" style={styles.white} testID="offer-gallery-position">
              {t('offer.photoPosition', { current: index + 1, total: photos.length })}
            </ThemedText>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000' },
  area: { flex: 1 },
  strip: { position: 'absolute', left: 0, right: 0, flexGrow: 0 },
  stripContent: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  thumb: { width: THUMB, height: THUMB, borderRadius: 8, overflow: 'hidden', borderWidth: 2 },
  thumbCurrent: { borderColor: '#ffffff', opacity: 1 },
  thumbOther: { borderColor: 'transparent', opacity: 0.6 },
  thumbImage: { width: '100%', height: '100%' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  barPrice: { flex: 1 },
  button: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, borderRadius: 12, alignItems: 'center' },
  pressed: { opacity: 0.7 },
  white: { color: '#ffffff' },
  close: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  position: {
    position: 'absolute',
    height: 36,
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
