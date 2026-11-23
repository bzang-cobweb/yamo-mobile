import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { Partner } from '../types';
import { PartnerLogo } from './PartnerLogo';

/** La taille d'un logo du carrousel. */
const LOGO_SIZE = 96;

type Props = {
  partners: Partner[];
};

/**
 * Le carrousel des partenaires, en bas de l'accueil (décisions 2026-11-23-module-partenaires,
 * 2026-11-23-partenaires-logos et 2026-11-23-partenaires-liste-detail) : le titre et une flèche vers la page
 * « Partenaires », puis leurs logos qui défilent de côté. Toucher un logo ouvre la page du partenaire ; le nom est
 * lu par les lecteurs d'écran. Sans partenaire, rien.
 */
export function PartnersStrip({ partners }: Props) {
  const { t } = useI18n();
  const theme = useTheme();

  if (partners.length === 0) {
    return null;
  }

  return (
    <View style={styles.section} testID="home-partners">
      <View style={styles.heading}>
        <ThemedText type="smallBold">{t('partners.title')}</ThemedText>
        {/* Une flèche, comme pour les villes (décision 2026-11-23-accueil-fleche-deux-cartes). */}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${t('home.seeAll')} ${t('partners.title')}`}
          hitSlop={Spacing.two}
          testID="home-partners-see-all"
          onPress={() => router.push('/partners')}>
          <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} tintColor={theme.text} size={20} />
        </Pressable>
      </View>
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
            onPress={() => router.push({ pathname: '/partners/[id]', params: { id: partner.id } })}
            style={({ pressed }) => pressed && styles.pressed}>
            <PartnerLogo partner={partner} size={LOGO_SIZE} framed={false} testID={`home-partner-${partner.id}`} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.four },
  row: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  pressed: { opacity: 0.7 },
});
