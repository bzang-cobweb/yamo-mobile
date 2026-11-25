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

/**
 * « Devenir partenaire », décrit par l'API : connecté, le formulaire d'ajout ; visiteur, la connexion (décisions
 * 2026-11-24-devenir-partenaire et 2026-11-25-accueil-carte-devenir-partenaire).
 */
export type PartnerBecome = { label: string; form: string | null; link: string | null };

/** Les partenaires de l'accueil, et la carte « Devenir partenaire » au bout du carrousel (`null` : pas de carte). */
export type HomePartners = { partners: Partner[]; become: PartnerBecome | null };
