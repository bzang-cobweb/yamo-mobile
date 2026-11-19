import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';

/** Un écran de l'app (`/members/37`, `/offers/22/calendar?month=2026-11`) : jamais une adresse externe. */
export const APP_LINK = /^\/[A-Za-z0-9._\-/]+(?:\?[a-z_]+=[A-Za-z0-9._-]+)?$/;

type TextLink = { text: string; link: string };

/**
 * Le texte d'une notification, ses passages liés en couleur (le nom d'un membre →
 * sa page, le nom de l'offre → l'annonce). Le même dans la liste et sur la page
 * d'une notification.
 */
export function NotificationText({ body, links, onLink, testID, type = 'small' }: { body: string; links: TextLink[]; onLink: (link: string) => void; testID: string; type?: 'small' | 'default' }) {
  const theme = useTheme();

  return (
    <ThemedText type={type} themeColor="textSecondary" testID={testID}>
      {segments(body, links).map((segment, index) =>
        segment.link === null ? (
          segment.text
        ) : (
          <ThemedText
            key={`${segment.link}-${index}`}
            type={type === 'small' ? 'smallBold' : 'default'}
            style={{ color: theme.primary, fontWeight: '600' }}
            accessibilityRole="link"
            testID={`${testID}-link-${index}`}
            onPress={() => segment.link && onLink(segment.link)}>
            {segment.text}
          </ThemedText>
        ),
      )}
    </ThemedText>
  );
}

/** Le texte découpé autour de ses passages liés : le premier endroit où chacun apparaît devient un lien. */
function segments(body: string, links: TextLink[]): { text: string; link: string | null }[] {
  let parts: { text: string; link: string | null }[] = [{ text: body, link: null }];

  for (const link of links) {
    if (!link.text || !APP_LINK.test(link.link)) {
      continue;
    }
    const index = parts.findIndex((part) => part.link === null && part.text.includes(link.text));
    if (index === -1) {
      continue;
    }
    const part = parts[index];
    const at = part.text.indexOf(link.text);
    parts = [
      ...parts.slice(0, index),
      ...(at > 0 ? [{ text: part.text.slice(0, at), link: null }] : []),
      { text: link.text, link: link.link },
      ...(at + link.text.length < part.text.length ? [{ text: part.text.slice(at + link.text.length), link: null }] : []),
      ...parts.slice(index + 1),
    ];
  }

  return parts;
}
