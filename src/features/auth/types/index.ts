import type { Locale, MessageKey } from '@/shared/i18n/messages';

/** Utilisateur renvoyé par l'API (`UserResource` du contrat `openapi.json`). */
export type User = {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  /** « Prénom Nom », calculé par l'API. */
  full_name: string;
  /** Initiales en majuscules sans accent, calculées par l'API (« EA »). */
  initials: string;
  gender: 'male' | 'female' | null;
  /** `AAAA-MM-JJ` ou `null`. */
  birth_date: string | null;
  country: { code: string; name: string; dial_code: string } | null;
  region: { id: number; name: string } | null;
  /** Description libre, non traduite, ou `null`. */
  description: string | null;
  /** Un compte a un e-mail et/ou un téléphone. */
  email: string | null;
  /** E.164 (`+41791234567`), ou `null`. */
  phone: string | null;
  /** Code ISO du pays de l'indicatif du téléphone. */
  phone_country: string | null;
  last_seen_at: string | null;
  is_online: boolean;
  locale: Locale;
  /** Vignette carrée de la photo de profil, ou `null` sans photo. */
  avatar_url: string | null;
};

/** Image choisie sur l'appareil, prête à l'envoi : son contenu JPEG en Base64. */
export type AvatarFile = { name: string; type: string; base64: string };

/**
 * Défi en cours : un code a été envoyé (`POST /auth/login`, `/auth/register`,
 * `/auth/me/email`, `/auth/me/phone`, ou code d'inscription suivant).
 */
export type Challenge = {
  challenge: string;
  channel: 'email' | 'sms';
  /** E-mail ou numéro masqué (`j•••@example.com`, `+41 ••• 67`). */
  destination: string;
};

/** Session ouverte : l'utilisateur et le jeton de l'appareil. */
export type Session = { user: User; token: string };

/** `POST /api/v1/auth/codes/verify`, réponse brute de l'API. */
export type VerifyResponse =
  | Challenge
  | { data: User; token: string }
  | { data: User }
  | { next: 'password'; challenge: string };

/** Résultat d'un code validé. */
export type VerifyResult =
  /** Un autre code est attendu (inscription avec e-mail et téléphone). */
  | { kind: 'pending'; challenge: Challenge }
  /** Connexion ou inscription achevée. */
  | { kind: 'session'; session: Session }
  /** Changement d'e-mail ou de téléphone enregistré. */
  | { kind: 'user'; user: User }
  /** Mot de passe oublié : code validé, le nouveau mot de passe peut être choisi. */
  | { kind: 'password'; challenge: string };

/** `GET /api/v1/auth/me`. */
export type UserResponse = { data: User };

export type AuthContextValue = {
  /** `true` tant que le jeton enregistré, l'utilisateur, les langues et les textes ne sont pas chargés. */
  isLoading: boolean;
  /** Démarrage impossible (pas de réseau, serveur injoignable) : l'app affiche l'écran hors ligne (textes locaux). */
  offline: boolean;
  /** Une nouvelle tentative est en cours. */
  isRetrying: boolean;
  /** Relance les chargements qui ont échoué. */
  retry: () => void;
  user: User | null;
  /** Langue de l'app : celle du compte, sinon la meilleure langue de l'appareil. */
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string>) => string;
  /** Ouvre la session une fois le code validé (connexion, inscription). */
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  /** Remplace l'utilisateur connecté après une modification de son compte (langue…). */
  setUser: (user: User) => void;
};
