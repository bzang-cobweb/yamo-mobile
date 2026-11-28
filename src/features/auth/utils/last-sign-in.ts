import type { FormValues } from '@/features/form/types';
import { readItem, removeItem, saveItem } from '@/shared/storage/device-storage';

import type { LoginChannel, User } from '../types';

/**
 * Le dernier moyen de connexion, gardé sur l'appareil après une connexion réussie (le « cookie » de la demande,
 * décision 2026-11-28-app-connexion-panneau) : le canal utilisé, l'e-mail et le numéro du compte (et leurs versions
 * masquées, les seules affichées), le pays du numéro, le prénom et le nom. Il propose « Bon retour » ; « Ce n'est pas
 * vous ? » l'efface. L'indicatif du numéro est gardé à part ({@link readLastPhoneCountry}) : il n'identifie personne et
 * reste l'indicatif par défaut du formulaire, même après « Ce n'est pas vous ? ».
 */
export type LastSignIn = {
  channel: LoginChannel;
  email: string | null;
  email_masked: string | null;
  /** E.164 (`+41791234567`). */
  phone: string | null;
  /** Code ISO du pays du numéro : aussi l'indicatif par défaut du formulaire de connexion. */
  phone_country: string | null;
  phone_masked: string | null;
  first_name: string;
  last_name: string;
};

/** Dans le stockage chiffré du système, comme le jeton (`token-storage`). */
const KEY = 'yamo.auth.last-sign-in';
const COUNTRY_KEY = 'yamo.auth.last-phone-country';

/** Le dernier moyen mémorisé, ou `null` (aucun, illisible, d'une autre forme). */
export async function readLastSignIn(): Promise<LastSignIn | null> {
  try {
    const raw = await readItem(KEY);

    return raw === null ? null : parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Mémorise le compte qui vient de se connecter et le canal utilisé ; un échec du stockage ne bloque pas la connexion. */
export async function saveLastSignIn(user: User, channel: LoginChannel): Promise<void> {
  try {
    await saveItem(KEY, JSON.stringify(lastSignInFrom(user, channel)));
    if (user.phone_country) {
      await saveItem(COUNTRY_KEY, user.phone_country);
    }
  } catch {
    // Rien de grave : la prochaine fois, le formulaire au lieu de « Bon retour ».
  }
}

/** L'indicatif (code ISO du pays) du dernier numéro d'un compte connecté sur l'appareil, ou `null`. */
export async function readLastPhoneCountry(): Promise<string | null> {
  try {
    return await readItem(COUNTRY_KEY);
  } catch {
    return null;
  }
}

/** « Ce n'est pas vous ? » : l'appareil oublie le dernier moyen (pas l'indicatif). */
export async function clearLastSignIn(): Promise<void> {
  try {
    await removeItem(KEY);
  } catch {
    // Déjà absent ou stockage indisponible.
  }
}

export function lastSignInFrom(user: User, channel: LoginChannel): LastSignIn {
  return {
    channel,
    email: user.email,
    email_masked: user.email_masked ?? null,
    phone: user.phone,
    phone_country: user.phone_country,
    phone_masked: user.phone_masked ?? null,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

/**
 * L'identifiant mémorisé pour ce canal, prêt pour `POST /auth/login` (`{channel, email}` ou
 * `{channel, phone, phone_country}`) ; `null` s'il n'est pas connu.
 */
export function loginValuesFor(memory: LastSignIn, channel: LoginChannel): FormValues | null {
  if (channel === 'email') {
    return memory.email ? { channel, email: memory.email } : null;
  }

  return memory.phone ? { channel, phone: memory.phone, phone_country: memory.phone_country ?? '' } : null;
}

/** L'identifiant masqué de ce canal, celui qu'on affiche ; `null` s'il n'est pas connu. */
export function maskedFor(memory: LastSignIn, channel: LoginChannel): string | null {
  return channel === 'email' ? memory.email_masked : memory.phone_masked;
}

/** Le canal d'un code envoyé (`sms`) tel que le formulaire de connexion le nomme (`phone`). */
export function channelOf(sent: 'email' | 'sms'): LoginChannel {
  return sent === 'sms' ? 'phone' : 'email';
}

function parse(value: unknown): LastSignIn | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const memory = value as Record<string, unknown>;
  if (memory.channel !== 'email' && memory.channel !== 'phone') {
    return null;
  }
  const text = (key: string) => (typeof memory[key] === 'string' ? (memory[key] as string) : null);

  const parsed: LastSignIn = {
    channel: memory.channel,
    email: text('email'),
    email_masked: text('email_masked'),
    phone: text('phone'),
    phone_country: text('phone_country'),
    phone_masked: text('phone_masked'),
    first_name: text('first_name') ?? '',
    last_name: text('last_name') ?? '',
  };

  // Sans l'identifiant du canal retenu, « Bon retour » ne saurait pas où envoyer le code.
  return loginValuesFor(parsed, parsed.channel) === null ? null : parsed;
}
