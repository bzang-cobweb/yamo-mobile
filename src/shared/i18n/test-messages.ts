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
  'profile.addEmail': 'Ajouter une adresse e-mail',
  'profile.changeEmail': "Changer d'adresse e-mail",
  'profile.addPhone': 'Ajouter un numéro',
  'profile.changePhone': 'Changer de numéro',
  'profile.emailSaved': 'Adresse e-mail enregistrée.',
  'profile.phoneSaved': 'Numéro enregistré.',
  'auth.createAccount': 'Créer un compte',
  'auth.haveAccount': "J'ai déjà un compte",
  'auth.codeSent': 'Code envoyé à :destination.',
  'auth.resend': 'Renvoyer le code',
  'auth.resent': 'Nouveau code envoyé.',
  'auth.forgotPassword': 'Mot de passe oublié ?',
  'auth.forgotPasswordTitle': 'Mot de passe oublié',
  'nav.back': 'Retour',
  'auth.passwordReset': 'Mot de passe modifié, connectez-vous.',
  'auth.previousStep': 'Étape précédente',
  'auth.signIn': 'Se connecter',
  'form.next': 'Suivant',
  'form.previous': 'Précédent',
  'form.stepOf': 'Étape :current sur :total',
  'form.loading': 'Chargement du formulaire…',
  'form.submitting': 'Envoi…',
  'form.selectPlaceholder': 'Choisir…',
  'form.showPassword': 'Afficher le mot de passe',
  'form.hidePassword': 'Masquer le mot de passe',
  'form.retry': 'Réessayer',
  'form.clearDate': 'Effacer',
  'form.search': 'Rechercher…',
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
