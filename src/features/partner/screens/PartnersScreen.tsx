import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useListDefinition } from '@/features/list/hooks/useListDefinition';
import { openListFooter } from '@/features/list/utils/openListFooter';
import type { ListItem } from '@/features/list/types';
import { NetworkError } from '@/shared/api/errors';
import { BackHeader } from '@/shared/components/BackHeader';
import { FixedButtonBar } from '@/shared/components/FixedButtonBar';
import { List } from '@/shared/components/List';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { PartnerLogo } from '../components/PartnerLogo';
import { openPartnerDetail } from '../utils/openPartner';

/** La liste servie par l'API : tous les partenaires visibles (décision 2026-11-23-partenaires-liste-detail). */
export const PARTNERS_LIST = 'partner.all';

const LOGO_SIZE = 56;
const SEARCH_DELAY = 300;

/**
 * La page « Partenaires » (décisions 2026-11-23-partenaires-liste-detail et 2026-11-23-partenaires-recherche) : la
 * liste générique, comme toutes les autres (recherche, défilement infini, tirer pour recharger) ; pour chaque
 * partenaire, son logo, son nom et le début de sa description. Toucher une carte ouvre la page du partenaire.
 */
export function PartnersScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const query = useListDefinition(PARTNERS_LIST, search);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), SEARCH_DELAY);

    return () => clearTimeout(timer);
  }, [searchText]);

  const definition = query.data;

  async function refresh() {
    setRefreshing(true);
    try {
      await query.reload();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={definition?.title ?? t('partners.title')} />
          {query.isPending || query.isError || !definition ? (
            <View style={styles.center}>
              {query.isPending ? (
                <ActivityIndicator accessibilityLabel={t('list.loading')} testID="partners-loading" />
              ) : (
                <>
                  <ThemedText themeColor="textSecondary" accessibilityRole="alert">
                    {query.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}
                  </ThemedText>
                  <Pressable accessibilityRole="button" testID="partners-retry" onPress={() => query.refetch()}>
                    <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <List<ListItem>
              testID="partners-list"
              items={definition.items}
              keyExtractor={(item) => item.id}
              renderItem={(item) => (
                <Pressable
                  testID={`partners-item-${item.id}`}
                  accessibilityRole="link"
                  onPress={() => openPartnerDetail(item.id)}
                  style={({ pressed }) => [styles.card, { borderColor: theme.backgroundSelected }, pressed && styles.pressed]}>
                  <PartnerLogo partner={{ name: item.title, logo: item.image }} size={LOGO_SIZE} framed={false} named={false} testID={`partners-item-${item.id}`} />
                  <View style={styles.texts}>
                    <ThemedText type="smallBold">{item.title}</ThemedText>
                    {item.subtitle && (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                        {item.subtitle}
                      </ThemedText>
                    )}
                  </View>
                </Pressable>
              )}
              hasMore={query.hasNextPage}
              onLoadMore={() => query.fetchNextPage()}
              loadingMore={query.isFetchingNextPage}
              loadingMoreLabel={t('list.loading')}
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              empty={search ? t('list.noResults') : definition.empty}
              search={definition.search ? { value: searchText, onChange: setSearchText, placeholder: definition.search } : null}
              contentContainerStyle={styles.content}
            />
          )}
          {/* « Devenir partenaire », décrit par l'API : connecté, le formulaire ; visiteur, la connexion (décision
              2026-11-24-devenir-partenaire). */}
          {definition?.footer && (
            <FixedButtonBar label={definition.footer.label} onPress={() => definition.footer && openListFooter(definition.footer)} testID="partners-footer" />
          )}
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', padding: Spacing.four, gap: Spacing.two },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderWidth: 1, borderRadius: 8, padding: Spacing.two },
  texts: { flex: 1, gap: Spacing.one },
  pressed: { opacity: 0.7 },
});
