import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { partnerService } from '../services/PartnerService';
import type { Partner } from '../types';

/** La taille d'un logo du carrousel. */
const LOGO_SIZE = 96;

type Props = {
  partners: Partner[];
};

/**
 * Le carrousel des partenaires, en bas de l'accueil (décisions 2026-11-23-module-partenaires et
 * 2026-11-23-partenaires-logos) : leurs logos seuls, qui défilent de côté. Toucher un logo compte un clic et
 * ouvre son lien dans le navigateur de l'app ; le nom est lu par les lecteurs d'écran, et affiché au centre du
 * cadre, sans fond, à la place d'un logo absent. Sans partenaire, rien.
 */
export function PartnersStrip({ partners }: Props) {
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
            accessibilityLabel={partner.name}
            onPress={() => open(partner)}
            // Sans logo, le nom au centre du cadre, sans fond (décision 2026-11-23-partenaires-logos).
            style={({ pressed }) => [styles.tile, { borderColor: theme.backgroundSelected }, pressed && styles.pressed]}>
            {partner.logo ? (
              <Image source={{ uri: partner.logo }} style={styles.logo} contentFit="contain" accessible={false} testID={`home-partner-${partner.id}-logo`} />
            ) : (
              <ThemedText type="smallBold" style={styles.name} numberOfLines={3}>
                {partner.name}
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
  tile: {
    width: LOGO_SIZE + 2 * Spacing.two,
    height: LOGO_SIZE + 2 * Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  name: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
