import { APP_LOCALES, DEFAULT_LOCALE, OFFLINE_MESSAGES, type Locale, type Messages, type TranslationParams } from './messages';

export function isLocale(value: string | null | undefined): value is Locale {
  return APP_LOCALES.includes(value as Locale);
}

/**
 * Meilleure langue disponible pour un appareil : la première de ses langues
 * préférées, **dans leur ordre**, que l'app sait afficher et que l'API propose.
 * Une langue régionale vaut sa langue (`fr-CH` → `fr`). Aucune ne correspond →
 * la langue par défaut.
 *
 * @param preferred langues préférées de l'appareil, de la plus à la moins souhaitée (`de-CH`, `en-GB`…)
 * @param available langues proposées par l'API (`GET /api/v1/locales`)
 */
export function pickBestLocale(preferred: readonly string[], available: readonly string[], fallback: string = DEFAULT_LOCALE): Locale {
  const offered = available.filter(isLocale);

  for (const tag of preferred) {
    const language = tag.toLowerCase().split(/[-_]/)[0];

    if ((offered as string[]).includes(language)) {
      return language as Locale;
    }
  }

  return isLocale(fallback) ? fallback : DEFAULT_LOCALE;
}

/**
 * Texte d'une clé : celui de l'absence de réseau est local, tous les autres
 * viennent de l'API. Une clé que l'API n'a pas envoyée s'affiche telle quelle,
 * pour que l'oubli se voie. Variables au format Laravel (`:name`).
 */
export function translate(
  messages: Messages,
  locale: Locale,
  key: string,
  params: TranslationParams = {},
): string {
  const local: Record<string, string> = OFFLINE_MESSAGES[locale];
  const text = local[key] ?? messages[key] ?? key;

  return text.replace(/:([A-Za-z]\w*)/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
