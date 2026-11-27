import type { StatusTagValue } from '@/shared/components/StatusTag';
import type { Views } from '@/shared/components/ViewsCount';

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
  /** Sur sa page, pour ses comptes seulement : ses vues (décisions 2026-11-25-partenaire-vues-sur-sa-page et 2026-11-25-vues-oeil). */
  views?: Views | null;
  /** Sur sa page, pour ses comptes seulement : leur nombre, rédigé (« 3 membres »), et chacun, les administrateurs d'abord (décision 2026-11-27-partenaire-membres). */
  members_label?: string | null;
  members?: PartnerMember[] | null;
};

/** Un compte d'un partenaire : sa photo, son nom, sa page, son e-mail et son téléphone ; la pastille « Administrateur » s'il l'est. */
export type PartnerMember = {
  id: string;
  name: string;
  initials: string;
  photo: string | null;
  link: string;
  /** Ses coordonnées, entre comptes d'un même partenaire (décision 2026-11-27-partenaire-membre-panneau). */
  email: string | null;
  phone: string | null;
  tag: StatusTagValue | null;
};

/**
 * « Devenir partenaire », décrit par l'API : connecté, le formulaire d'ajout ; visiteur, la connexion (décisions
 * 2026-11-24-devenir-partenaire et 2026-11-25-accueil-carte-devenir-partenaire).
 */
export type PartnerBecome = { label: string; form: string | null; link: string | null };

/** Les partenaires de l'accueil, et la carte « Devenir partenaire » au bout du carrousel (`null` : pas de carte). */
export type HomePartners = { partners: Partner[]; become: PartnerBecome | null };
