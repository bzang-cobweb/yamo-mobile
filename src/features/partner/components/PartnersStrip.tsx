import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { partnerService } from '../services/PartnerService';
import type { Partner } from '../types';

const LOGO_SIZE = 48;

type Props = {
  partners: Partner[];
  /** La largeur d'une carte, celle des cartes d'offres de l'accueil. */
  cardWidth: number;
};

/**
 * L'espace des partenaires, en bas de l'accueil (décision 2026-11-23-module-partenaires) : un titre, puis une
 * carte par partenaire qui défile de côté (logo, nom, description, bouton). Toucher une carte compte un clic et
 * ouvre son lien dans le navigateur de l'app. Sans partenaire, rien.
 */
export function PartnersStrip({ partners, cardWidth }: Props) {
  const { t } = useI18n();
  const theme = useTheme();

  if (partners.length === 0) {
    return null;
  }

  function open(partner: Partner) {
    // Le clic compte même si le lien ne s'ouvre pas ; une erreur réseau ne bloque pas l'ouverture.
    void partnerService.click(partner.id).catch(() => undefined);
    if (partner.url) {
      void WebBrowser.openBrowserAsync(partner.url);
    }
  }

  return (
    <View style={styles.section} testID="home-partners">
      <ThemedText type="smallBold" style={styles.title}>
        {t('partners.title')}
      </ThemedText>
      <FlatList
        horizontal
        data={partners}
        keyExtractor={(partner) => partner.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item: partner }) => (
          <Pressable
            testID={`home-partner-${partner.id}`}
            accessibilityRole="link"
            accessibilityLabel={[partner.name, partner.cta_label].filter(Boolean).join(', ')}
            onPress={() => open(partner)}
            style={({ pressed }) => [styles.card, { width: cardWidth, borderColor: theme.backgroundSelected }, pressed && styles.pressed]}>
            <View style={styles.head}>
              {partner.logo ? (
                <Image source={{ uri: partner.logo }} style={styles.logo} contentFit="contain" accessible={false} />
              ) : (
                <View style={[styles.logo, { backgroundColor: theme.backgroundElement }]} />
              )}
              <ThemedText type="smallBold" style={[styles.text, styles.name]} numberOfLines={2}>
                {partner.name}
              </ThemedText>
            </View>
            {partner.description && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.text} numberOfLines={3}>
                {partner.description}
              </ThemedText>
            )}
            {partner.cta_label && (
              <ThemedText type="linkPrimary" style={styles.text}>
                {partner.cta_label}
              </ThemedText>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  title: { paddingHorizontal: Spacing.four },
  row: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  card: { borderRadius: 8, borderWidth: 1, padding: Spacing.two, gap: Spacing.one },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: 8 },
  name: { flex: 1 },
  // La police des cartes de l'accueil (décision 2026-11-23-accueil-fleche-deux-cartes).
  text: { fontSize: 11, lineHeight: 15 },
  pressed: { opacity: 0.7 },
});
