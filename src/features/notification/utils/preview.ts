/**
 * L'aperçu d'un texte de notification sur sa carte (décision 2026-11-26-cartes-notifications-tronquees) : quel que soit le
 * type de la notification, le texte et le message sont tronqués à `NOTIFICATION_CARD_MAX` caractères visibles. La page
 * de la notification, elle, montre tout.
 */
// 80 caractères, environ deux lignes sur un téléphone ; à 120 (trois lignes), la coupe ne se voyait pas (décision
// 2026-11-26-carte-expediteur-avant-texte).
export const NOTIFICATION_CARD_MAX = 80;

/** Le signe qui termine un texte tronqué. */
const ELLIPSIS = '…';

/**
 * Le texte tel qu'il se lit sur une ligne : sans balises (`<b>`, `<a href="…">` : retirées avant de compter, jamais
 * coupées en deux), les retours à la ligne et les espaces répétés réduits à une espace.
 */
export function plainText(text: string): string {
  return text.replace(/<\/?[A-Za-z][^<>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * `text` tronqué à `max` caractères : coupé à la fin d'un mot quand c'est possible, suivi de « … » ; tel quel s'il tient.
 */
export function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }

  return `${cut(text, max)}${ELLIPSIS}`;
}

/** Un passage du texte d'une notification : lié à un écran (`link`), ou non (`null`). */
export type Segment = { text: string; link: string | null };

/**
 * Les passages d'un texte, tronqués ensemble à `max` caractères visibles : un passage lié n'est jamais coupé (il reste
 * entier ou disparaît avec la suite) ; le texte s'arrête sur « … ».
 */
export function truncateSegments(segments: Segment[], max: number): Segment[] {
  const total = segments.reduce((length, segment) => length + segment.text.length, 0);
  if (total <= max) {
    return segments;
  }

  const kept: Segment[] = [];
  let used = 0;
  for (const segment of segments) {
    const room = max - used;
    if (segment.text.length <= room) {
      kept.push(segment);
      used += segment.text.length;
      continue;
    }
    // Un passage lié qui dépasse : il disparaît avec la suite. Un texte : coupé à la place restante.
    if (segment.link === null && room > 0) {
      kept.push({ text: cut(segment.text, room), link: null });
    }
    break;
  }

  // « … » après le dernier passage gardé, sans espace avant.
  const last = kept.at(-1);
  if (last && last.link === null) {
    kept[kept.length - 1] = { text: `${last.text.trimEnd()}${ELLIPSIS}`, link: null };
  } else {
    kept.push({ text: ELLIPSIS, link: null });
  }

  return kept;
}

/** Les `max` premiers caractères, ramenés à la fin du dernier mot entier s'il en reste assez, sans espace à la fin. */
function cut(text: string, max: number): string {
  const head = text.slice(0, max);
  const space = head.lastIndexOf(' ');

  return (space > max * 0.6 ? head.slice(0, space) : head).trimEnd();
}
