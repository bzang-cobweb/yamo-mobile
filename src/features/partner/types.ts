/** Un partenaire de l'accueil, ses textes dans la langue de l'app (décision 2026-11-23-module-partenaires). */
export type Partner = {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  cta_label: string | null;
  logo: string | null;
  /** Sur la page du partenaire seulement : son e-mail et son téléphone (décision 2026-11-24-partenaire-contact). */
  contact_email?: string | null;
  contact_phone?: string | null;
};
