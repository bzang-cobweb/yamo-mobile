import { translate } from './locale';
import type { I18nValue } from './I18nContext';
import type { Messages } from './messages';

/**
 * Textes servis par l'API, en français, pour les tests (copie de
 * `lang/fr/mobile.php` côté Laravel). Jamais importé par l'app.
 */
export const TEST_MESSAGES: Messages = {
  'tabs.home': 'Accueil',
  'tabs.profile': 'Profil',
  'home.greeting': 'Bonjour :name',
  'profile.title': 'Profil',
  'profile.personalInfo': 'Informations personnelles',
  'profile.password': 'Changer le mot de passe',
  'profile.preferences': 'Préférences',
  'profile.saved': 'Modifications enregistrées.',
  'profile.passwordSaved': 'Mot de passe modifié.',
  'profile.signOut': 'Se déconnecter',
  'profile.back': 'Retour',
  'form.loading': 'Chargement du formulaire…',
  'form.submitting': 'Envoi…',
  'form.selectPlaceholder': 'Choisir…',
  'form.showPassword': 'Afficher le mot de passe',
  'form.hidePassword': 'Masquer le mot de passe',
  'form.retry': 'Réessayer',
  'avatar.label': 'Photo de profil',
  'avatar.change': 'Modifier la photo',
  'avatar.choose': 'Choisir une photo',
  'avatar.remove': 'Retirer la photo',
  'avatar.cancel': 'Annuler',
  'avatar.uploading': 'Envoi de la photo…',
  'error.unknown': 'Une erreur est survenue. Réessayez.',
};

export const TEST_I18N: I18nValue = {
  locale: 'fr',
  t: (key, params) => translate(TEST_MESSAGES, 'fr', key, params),
};
