/**
 * La date d'un avis (« 18 nov. 2026 »), formatée par l'app dans la langue et le fuseau du téléphone : la même sur la
 * fiche d'une offre et dans la liste de ses avis (décision 2026-11-25-avis-date-formatee-app).
 */
export function reviewDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { dateStyle: 'medium' });
}
