import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/features/auth/components/Avatar';
import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { NetworkError } from '@/shared/api/errors';
import { BackHeader } from '@/shared/components/BackHeader';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useMember } from '../hooks/useMember';

/**
 * La page publique d'un membre (décision 2026-11-19-page-membre) :
 * - sa photo, son nom, « Membre depuis » ;
 * - sa présentation ;
 * - ses informations (ville, séjours).
 *
 * Tout est servi par l'API, jamais ses coordonnées.
 */
export function MemberScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const theme = useTheme();
  const query = useMember(id);
  const member = query.data;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={member?.title ?? ''} />
          {query.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator testID="member-loading" />
            </View>
          ) : query.isError || !member ? (
            <View style={styles.center}>
              <ThemedText style={styles.error} accessibilityRole="alert" testID="member-error">
                {query.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}
              </ThemedText>
              <Pressable accessibilityRole="button" testID="member-retry" onPress={() => query.refetch()}>
                <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={[styles.body, { maxWidth: MaxContentWidth / 2 }]}>
              <View style={styles.identity}>
                <Avatar user={{ initials: member.initials, avatar_url: member.photo }} size={96} />
                <ThemedText type="subtitle" accessibilityRole="header" style={styles.centered} testID="member-name">
                  {member.name}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.centered} testID="member-since">
                  {member.since}
                </ThemedText>
              </View>
              {member.description && <ThemedText testID="member-description">{member.description}</ThemedText>}
              <View style={[styles.facts, { borderColor: theme.backgroundSelected }]}>
                {member.facts.map((fact) => (
                  <View key={fact.label} style={styles.fact} testID={`member-fact-${fact.label}`}>
                    <ThemedText themeColor="textSecondary">{fact.label}</ThemedText>
                    <ThemedText type="smallBold">{fact.value}</ThemedText>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  error: { color: ERROR_COLOR },
  body: { width: '100%', alignSelf: 'center', padding: Spacing.four, gap: Spacing.four },
  identity: { alignItems: 'center', gap: Spacing.one },
  centered: { textAlign: 'center' },
  facts: { borderTopWidth: 1, paddingTop: Spacing.two, gap: Spacing.two },
  fact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
