import type { Locale, Translate } from '@/shared/i18n/messages';

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
  /** Le même numéro au format international lisible (`+41 79 123 45 67`), pour l'affichage. */
  phone_international: string | null;
  /** Code ISO du pays de l'indicatif du téléphone. */
  phone_country: string | null;
  /** L'e-mail en partie masqué (« j•••@example.com »), celui qu'on affiche (décision 2026-11-27-email-telephone-masques). */
  email_masked?: string | null;
  /** Le numéro en partie masqué (« +41 ••• 67 »), celui qu'on affiche. */
  phone_masked?: string | null;
  /** L'e-mail est vérifié (un code reçu). */
  email_verified?: boolean;
  /** Le numéro est vérifié (un code reçu). */
  phone_verified?: boolean;
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

/** Le canal d'un identifiant, tel que le formulaire `auth.login` le nomme (`channel`). */
export type LoginChannel = 'email' | 'phone';

/**
 * L'étape du mot de passe, après le code (contrat 2026-11-28-connexion-panneau) : `sign-in`, un compte avec mot de
 * passe ; `create`, un compte sans mot de passe ; `register`, pas de compte (le mot de passe précède l'inscription).
 */
export type PasswordMode = 'sign-in' | 'create' | 'register';

/** `POST /api/v1/auth/session`, réponse : connecté, ou l'inscription à remplir avec le même défi. */
export type SessionResponse = { data: User; token: string } | { next: 'register'; challenge: string };

/** Résultat de l'étape du mot de passe. */
export type SessionResult = { kind: 'session'; session: Session } | { kind: 'register'; challenge: string };

/** Session ouverte : l'utilisateur et le jeton de l'appareil. */
export type Session = { user: User; token: string };

/** `POST /api/v1/auth/codes/verify`, réponse brute de l'API. */
export type VerifyResponse =
  | Challenge
  | { data: User; token: string }
  | { data: User }
  | { next: 'password'; challenge: string; mode?: PasswordMode }
  | { next: 'restore'; challenge: string; deletion_date: string; /** Formatée par le serveur (2026-11-25-dates-formatees-serveur). */ deletion_date_text?: string | null };

/** Résultat d'un code validé. */
export type VerifyResult =
  /** Un autre code est attendu (inscription avec e-mail et téléphone). */
  | { kind: 'pending'; challenge: Challenge }
  /** Connexion ou inscription achevée. */
  | { kind: 'session'; session: Session }
  /** Changement d'e-mail ou de téléphone enregistré. */
  | { kind: 'user'; user: User }
  /** Connexion ou inscription : code validé, l'étape du mot de passe suit (selon `mode`). */
  | { kind: 'password'; challenge: string; mode: PasswordMode }
  /** Connexion à un compte en attente de suppression : il peut être récupéré jusqu'à `deletionDate`, déjà formatée par le serveur. */
  | { kind: 'restore'; challenge: string; deletionDate: string };

/** `GET /api/v1/auth/me`. */
export type UserResponse = { data: User };

/**
 * Lien du menu du profil, défini par le serveur : il ouvre soit le formulaire
 * `form` (`/profile/[form]`), soit la liste `list` (`/profile/lists/[list]`).
 * L'app les affiche et les envoie sans les connaître d'avance, ce qui permet
 * d'ajouter un lien sans nouvelle version de l'app.
 */
/** Un lien du menu du profil, et son groupe (« Compte », « Voyageur », « Hôte » ; décision 2026-11-19-contrat-reservations-logements-profil). */
/**
 * Un lien du menu du profil : il ouvre un formulaire (`form`), une liste (`list`) ou un sous-menu (`menu`, décision
 * 2026-11-27-menu-profil-icones-sous-menus) ; `icon` : le symbole devant le libellé, par plateforme.
 */
export type ProfileMenuItem = {
  key: string;
  label: string;
  form?: string;
  list?: string;
  menu?: string;
  icon?: { ios: string; android: string } | null;
  group?: { key: string; label: string };
};

/** `GET /api/v1/auth/me/menu/{menu}` : un sous-menu, son titre et ses liens. */
export type ProfileSubMenu = { title: string; data: ProfileMenuItem[] };

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
  t: Translate;
  /** Ouvre la session une fois le code validé (connexion, inscription). */
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  /** Remplace l'utilisateur connecté après une modification de son compte (langue…). */
  setUser: (user: User) => void;
};
