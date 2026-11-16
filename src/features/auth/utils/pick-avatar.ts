import { launchImageLibraryAsync } from 'expo-image-picker';

import type { AvatarFile } from '../types';

/**
 * Compression JPEG appliquée sur le téléphone avant l'envoi. Le serveur réduit et
 * réencode encore l'image (WebP, 512 px) : ici, on allège surtout le transfert.
 */
const QUALITY = 0.7;

/**
 * Ouvre la galerie (pas l'appareil photo) et laisse recadrer en carré. Renvoie
 * l'image prête à l'envoi, ou `null` si l'utilisateur annule.
 */
export async function pickAvatar(): Promise<AvatarFile | null> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: QUALITY,
    exif: false,
    // Contenu JPEG compressé, envoyé tel quel (voir `shared/api/form-file.ts`).
    base64: true,
  });

  const asset = result.canceled ? undefined : result.assets[0];

  if (!asset?.base64) {
    return null;
  }

  // Avec `base64`, le contenu fourni est toujours du JPEG.
  return { name: 'avatar.jpg', type: 'image/jpeg', base64: asset.base64 };
}
