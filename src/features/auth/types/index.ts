import type { Locale, MessageKey } from '@/shared/i18n/messages';

/** Utilisateur renvoyé par l'API (`UserResource` du contrat `openapi.json`). */
export type User = {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  locale: Locale;
  /** Vignette carrée de la photo de profil, ou `null` sans photo. */
  avatar_url: string | null;
};

/** Image choisie sur l'appareil, prête à l'envoi : son contenu JPEG en Base64. */
export type AvatarFile = { name: string; type: string; base64: string };

/** Champs saisis à la connexion (formulaire `auth.login`). */
export type LoginCredentials = Record<string, unknown> & {
  email?: string;
  password?: string;
};

/** `POST /api/v1/auth/login`. */
export type LoginResponse = { data: User; token: string };

/** `GET /api/v1/auth/me`. */
export type UserResponse = { data: User };

export type AuthContextValue = {
  /** `true` tant que le jeton enregistré, l'utilisateur et les langues ne sont pas chargés. */
  isLoading: boolean;
  user: User | null;
  /** Langue de l'app : celle du compte, sinon la meilleure langue de l'appareil. */
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string>) => string;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  /** Remplace l'utilisateur connecté après une modification de son compte (langue…). */
  setUser: (user: User) => void;
};
