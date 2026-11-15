import { createContext, useContext } from 'react';

import { translate } from './locale';
import { DEFAULT_LOCALE, type Locale, type MessageKey } from './messages';

export type I18nValue = {
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string>) => string;
};

/**
 * Langue courante de l'app, lisible par toutes les features sans dépendre de
 * celle qui la décide (la feature auth : langue du compte, sinon de l'appareil).
 */
export const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
});

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
