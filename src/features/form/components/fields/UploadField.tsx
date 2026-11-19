import { Image } from 'expo-image';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { formFileFromBase64 } from '@/shared/api/form-file';
import { ApiError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { formService } from '../../services/FormService';
import type { FieldProps } from '../../types';
import { PENDING_UPLOAD } from '../../utils/values';
import { ERROR_COLOR, FieldShell } from '../FieldShell';

/** Compression JPEG sur le téléphone avant l'envoi ; le serveur réencode encore (WebP). */
const QUALITY = 0.7;

/** Taille d'un contenu Base64 décodé, en Ko. */
function sizeKb(base64: string): number {
  return (base64.length * 3) / 4 / 1024;
}

/** « 10 Mo », « 500 Ko ». */
function readableSize(kb: number): string {
  return kb >= 1024 ? `${Math.round(kb / 1024)} Mo` : `${kb} Ko`;
}

let pendingCounter = 0;

/**
 * Champ de fichiers (décision 2026-11-19-contrat-champ-upload-photos) : choisir des
 * images dans la galerie (pas d'appareil photo), plusieurs à la fois. Chacune part
 * aussitôt vers l'adresse servie par l'API ; la valeur du champ est la liste
 * ordonnée des identifiants, la première étant la principale. Les limites (types,
 * taille, nombre) sont celles que Laravel déclare : appliquées ici avant l'envoi,
 * et de nouveau par le serveur. Pendant un envoi, la valeur tient un identifiant
 * provisoire : l'étape et l'enregistrement attendent (`hasPendingUploads`).
 */
export function UploadField({ field, value, onChange, error, disabled }: FieldProps<string[]>) {
  const { t } = useI18n();
  const theme = useTheme();
  const settings = field.upload;
  const [previews, setPreviews] = useState<Record<string, string>>(() => Object.fromEntries((settings?.files ?? []).map((file) => [file.id, file.url])));
  const [message, setMessage] = useState<string | null>(null);
  // La dernière valeur connue : les envois se terminent après d'autres changements.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  if (!settings) {
    return null;
  }

  const limits = settings;
  const remaining = limits.max_files - value.length;

  function commit(next: string[]) {
    latest.current = next;
    onChange(next);
  }

  async function pick() {
    setMessage(null);
    const result = await launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: limits.max_files > 1,
      selectionLimit: Math.max(1, remaining),
      quality: QUALITY,
      exif: false,
      // Contenu JPEG compressé, envoyé tel quel (voir `shared/api/form-file.ts`).
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const assets = result.assets.filter((asset) => asset.base64);
    const kept = assets.slice(0, Math.max(0, remaining));
    const problems: string[] = assets.length > kept.length ? [t('form.uploadTooMany', { max: String(limits.max_files) })] : [];
    const type = 'image/jpeg';

    const accepted = kept.filter((asset) => {
      if (limits.accept.length > 0 && !limits.accept.includes(type)) {
        problems.push(t('form.uploadWrongType'));
        return false;
      }
      if (sizeKb(asset.base64 ?? '') > limits.max_size_kb) {
        problems.push(t('form.uploadTooLarge', { max: readableSize(limits.max_size_kb) }));
        return false;
      }
      return true;
    });

    const queued = accepted.map((asset) => ({
      key: `${PENDING_UPLOAD}${++pendingCounter}`,
      asset,
    }));
    setPreviews((previous) => ({
      ...previous,
      ...Object.fromEntries(queued.map(({ key, asset }) => [key, asset.uri])),
    }));
    commit([...latest.current, ...queued.map(({ key }) => key)]);
    setMessage(problems[0] ?? null);

    // Un envoi à la fois, dans l'ordre choisi.
    for (const { key, asset } of queued) {
      try {
        const id = await formService.upload(limits.endpoint, formFileFromBase64('photo.jpg', type, asset.base64 ?? ''));
        setPreviews((previous) => ({ ...previous, [id]: asset.uri }));
        commit(latest.current.map((item) => (item === key ? id : item)));
      } catch (caught) {
        commit(latest.current.filter((item) => item !== key));
        const detail = caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] : undefined;
        setMessage(detail ?? t('form.uploadFailed'));
      }
    }
  }

  function remove(id: string) {
    commit(latest.current.filter((item) => item !== id));
  }

  /** Déplace une photo d'une place (`-1` : vers la gauche, `1` : vers la droite) ; la première est la principale. */
  function move(id: string, step: -1 | 1) {
    const next = [...latest.current];
    const from = next.indexOf(id);
    const to = from + step;

    if (from < 0 || to < 0 || to >= next.length) {
      return;
    }

    [next[from], next[to]] = [next[to], next[from]];
    commit(next);
  }

  return (
    <FieldShell field={field} error={error ?? message ?? undefined}>
      <View style={styles.grid} testID={`field-${field.name}`}>
        {value.map((id, index) => {
          const sending = id.startsWith(PENDING_UPLOAD);

          return (
            <View key={id} style={styles.tile} testID={`field-${field.name}-item-${index}`}>
              <Image
                source={previews[id] ? { uri: previews[id] } : undefined}
                style={[styles.image, { backgroundColor: theme.backgroundElement }]}
                contentFit="cover"
              />
              {sending && (
                <View style={styles.overlay} accessibilityLabel={t('form.uploadSending')}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              {index === 0 && (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <ThemedText style={[styles.badgeText, { color: theme.onPrimary }]}>
                    {t('form.uploadMain')}
                  </ThemedText>
                </View>
              )}
              {/* Avancer ou reculer d'une place (décision 2026-11-19-nuit-ordre-photos-libelle). */}
              {!sending && index > 0 && (
                <Pressable
                  testID={`field-${field.name}-left-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('form.uploadMoveLeft')}
                  disabled={disabled}
                  hitSlop={Spacing.one}
                  onPress={() => move(id, -1)}
                  style={[styles.round, styles.left]}>
                  <ThemedText style={styles.arrowText}>‹</ThemedText>
                </Pressable>
              )}
              {!sending && index < value.length - 1 && (
                <Pressable
                  testID={`field-${field.name}-right-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('form.uploadMoveRight')}
                  disabled={disabled}
                  hitSlop={Spacing.one}
                  onPress={() => move(id, 1)}
                  style={[styles.round, styles.right]}>
                  <ThemedText style={styles.arrowText}>›</ThemedText>
                </Pressable>
              )}
              {!sending && (
                <Pressable
                  testID={`field-${field.name}-remove-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('form.uploadRemove')}
                  disabled={disabled}
                  hitSlop={Spacing.two}
                  onPress={() => remove(id)}
                  style={styles.remove}>
                  <ThemedText style={styles.removeText}>×</ThemedText>
                </Pressable>
              )}
            </View>
          );
        })}
        {remaining > 0 && (
          <Pressable
            testID={`field-${field.name}-add`}
            accessibilityRole="button"
            accessibilityLabel={t('form.uploadAdd')}
            disabled={disabled}
            onPress={pick}
            style={({ pressed }) => [
              styles.tile,
              styles.add,
              {
                borderColor: error || message ? ERROR_COLOR : theme.textSecondary,
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.plus} themeColor="textSecondary">
              +
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.addText}>
              {t('form.uploadAdd')}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { width: 104, height: 104, borderRadius: 8, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  badge: {
    position: 'absolute',
    // En haut à gauche : le bas porte les flèches, le haut droit le retrait.
    left: 4,
    top: 4,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  round: { position: 'absolute', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  left: { left: 4, bottom: 4, backgroundColor: 'rgba(0,0,0,0.6)' },
  right: { right: 4, bottom: 4, backgroundColor: 'rgba(0,0,0,0.6)' },
  arrowText: { color: '#fff', fontSize: 20, lineHeight: 22, fontWeight: '700' },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  removeText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  add: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: Spacing.one,
  },
  addText: { textAlign: 'center' },
  plus: { fontSize: 28, lineHeight: 30 },
  pressed: { opacity: 0.6 },
});
