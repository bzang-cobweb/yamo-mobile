import type { StatusTagValue } from '@/shared/components/StatusTag';

/** Un partenaire de l'accueil, ses textes dans la langue de l'app (décision 2026-11-23-module-partenaires). */
export type Partner = {
  id: string;
  name: string;
  /** Le slug, tiré du nom (décision 2026-11-25-slug-url-offres-partenaires). */
  url: string | null;
  /** Facultatif (décision 2026-11-24-partenaire-slogan). */
  slogan?: string | null;
  description: string | null;
  /** Le lien vers son site, ouvert par le bouton. */
  website: string | null;
  cta_label: string | null;
  logo: string | null;
  /** Sur la page du partenaire seulement : son e-mail et son téléphone (décision 2026-11-24-partenaire-contact). */
  contact_email?: string | null;
  contact_phone?: string | null;
  /** Sur sa page, pour ses comptes seulement : sa pastille, comme dans « Mes partenaires » (décision 2026-11-24-partenaire-page-statut). */
  status?: StatusTagValue | null;
};
