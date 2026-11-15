/**
 * Textes de l'interface de l'app (ce que l'API n'envoie pas : boutons, titres,
 * erreurs réseau). Les libellés des formulaires, eux, arrivent traduits de l'API.
 */

/** Langues dont l'app a les textes. Une langue proposée par l'API sans entrée ici n'est pas retenue. */
export const APP_LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof APP_LOCALES)[number];

/** Langue par défaut si l'API est injoignable : celle de l'API (`config('app.default_locale')`). */
export const DEFAULT_LOCALE: Locale = 'fr';

export const messages = {
  fr: {
    'signIn.title': 'Connexion',
    'home.greeting': 'Bonjour {name}',
    'home.signedInAs': 'Connecté en tant que {fullName}',
    'home.email': 'E-mail : {email}',
    'home.signOut': 'Se déconnecter',
    'home.profile': 'Mon profil',
    'profile.title': 'Profil',
    'profile.saved': 'Modifications enregistrées.',
    'profile.back': 'Retour',
    'form.loading': 'Chargement du formulaire…',
    'form.submitting': 'Envoi…',
    'form.selectPlaceholder': 'Choisir…',
    'error.network': 'Le serveur est injoignable. Vérifiez votre connexion.',
    'error.unknown': 'Une erreur est survenue. Réessayez.',
  },
  en: {
    'signIn.title': 'Sign in',
    'home.greeting': 'Hello {name}',
    'home.signedInAs': 'Signed in as {fullName}',
    'home.email': 'Email: {email}',
    'home.signOut': 'Sign out',
    'home.profile': 'My profile',
    'profile.title': 'Profile',
    'profile.saved': 'Changes saved.',
    'profile.back': 'Back',
    'form.loading': 'Loading form…',
    'form.submitting': 'Sending…',
    'form.selectPlaceholder': 'Choose…',
    'error.network': 'The server cannot be reached. Check your connection.',
    'error.unknown': 'Something went wrong. Please try again.',
  },
} satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)['fr'];
