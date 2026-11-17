import { createContext, useContext } from 'react';

import { translate } from './locale';
import { DEFAULT_LOCALE, type Locale, type Translate } from './messages';

export type I18nValue = {
  locale: Locale;
  t: Translate;
  /** Change la langue de l'app, avant d'avoir un compte (écran d'accueil). */
  chooseLocale: (locale: string) => void;
};

/**
 * Langue courante et textes de l'app, lisibles par toutes les features sans
 * dépendre de celle qui les décide (la feature auth : langue du compte, sinon de
 * l'appareil ; textes de l'API). Sans fournisseur : aucun texte de l'API, les
 * clés s'affichent telles quelles.
 */
export const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  t: (key, params) => translate({}, DEFAULT_LOCALE, key, params),
  chooseLocale: () => undefined,
});

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
