import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { takeProfileNotice } from '@/features/auth/utils/profile-notice';
import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { FavoriteHeart } from '@/features/list/components/FavoriteHeart';
import { ApiError, NetworkError } from '@/shared/api/errors';
import { Accordion } from '@/shared/components/Accordion';
import { BackHeader } from '@/shared/components/BackHeader';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { OfferReviews } from '../components/OfferReviews';
import { PhotoCarousel } from '../components/PhotoCarousel';
import { useOfferDetail } from '../hooks/useOfferDetail';

/**
 * Fiche d'une offre (`/offers/[id]`, décision 2026-11-18-fiche-offre), pour un
 * visiteur comme pour un membre, décrite par l'API : les photos en carrousel,
 * le titre, le prix, la ville, les caractéristiques, la description et la date de
 * publication, puis les avis (décision 2026-11-19-contrat-avis-offres). Une offre
 * introuvable affiche un message ; le retour ramène à l'accueil.
 *
 * Au retour du formulaire d'avis, ou après le retrait du sien, la fiche et les
 * listes se rechargent, et le message de l'API s'affiche.
 */
export function OfferDetailScreen({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const query = useOfferDetail(id);
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth, MaxContentWidth / 2);
  const offer = query.data;
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ message: string; failed: boolean } | null>(null);
  const shown = useRef(false);
  const { refetch } = query;

  // Un avis donné ou retiré : la fiche, et les listes (note, dernier avis), sont à recharger.
  const changed = useCallback(
    (message: string | null, failed = false) => {
      setNotice(message === null ? null : { message, failed });
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['list'] });
    },
    [queryClient, refetch],
  );

  useFocusEffect(
    useCallback(() => {
      // Le premier affichage charge déjà la fiche ; au retour du formulaire, son message.
      if (shown.current) {
        const message = takeProfileNotice();

        if (message !== null) {
          changed(message);
        }
      }
      shown.current = true;
    }, [changed]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={offer?.title ?? ''} />
          {query.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator testID="offer-loading" />
            </View>
          ) : !offer ? (
            <View style={styles.center}>
              <ThemedText themeColor="textSecondary" style={styles.centered} accessibilityRole="alert" testID="offer-unavailable">
                {query.error instanceof ApiError && query.error.status === 404
                  ? t('offer.unavailable')
                  : query.error instanceof NetworkError
                    ? t('offline.message')
                    : t('error.unknown')}
              </ThemedText>
              {!(query.error instanceof ApiError && query.error.status === 404) && (
                <Pressable accessibilityRole="button" testID="offer-retry" onPress={() => query.refetch()}>
                  <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
                </Pressable>
              )}
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} testID="offer-detail">
              <View style={{ width, alignSelf: 'center' }}>
                <PhotoCarousel photos={offer.photos} width={width} />
                {/* Le cœur d'un membre connecté, en haut à droite (décision 2026-11-19-contrat-vedette-favoris). */}
                {offer.favorite && <FavoriteHeart favorite={offer.favorite} testID="offer-favorite" />}
              </View>
              <View style={[styles.body, { maxWidth: MaxContentWidth / 2 }]}>
                {offer.status && (
                  <ThemedText type="small" themeColor="textSecondary" testID="offer-status">
                    {offer.status.label}
                  </ThemedText>
                )}
                <ThemedText type="subtitle" testID="offer-title">
                  {offer.title}
                </ThemedText>
                {/* Le prix seul, sans son libellé (décision 2026-11-19-fiche-offre-ordre). */}
                {offer.price && (
                  <ThemedText type="smallBold" style={{ color: theme.primary }} testID="offer-price">
                    {offer.price.value}
                  </ThemedText>
                )}

                {/* Puis la description, la localisation, les caractéristiques. */}
                {/* La description seule, sans titre (décision 2026-11-19-fiche-description-equipements). */}
                {offer.description && (
                  <View style={styles.section}>
                    <ThemedText testID="offer-description">{offer.description}</ThemedText>
                  </View>
                )}

                {/* Localisation, caractéristiques et avis : des sections repliables
                    (décision 2026-11-19-fiche-localisation-accordeon). */}
                {/* L'adresse complète, pays compris, et son indication (décision 2026-11-19-fiche-localisation). */}
                {offer.address && (
                  <Accordion title={t('offer.location')} testID="offer-location-block">
                    <View style={[styles.location, { borderBottomColor: theme.backgroundSelected }]}>
                      <ThemedText testID="offer-address">{offer.address}</ThemedText>
                      {offer.indication && (
                        <ThemedText type="small" themeColor="textSecondary" testID="offer-indication">
                          {offer.indication}
                        </ThemedText>
                      )}
                    </View>
                  </Accordion>
                )}

                {offer.facts.length > 0 && (
                  <Accordion title={t('offer.details')} testID="offer-facts">
                    {offer.facts.map((fact) => (
                      <FactRow key={fact.label} fact={fact} testID="offer-fact" />
                    ))}
                  </Accordion>
                )}

                {/* Règles et autres informations (décision 2026-11-19-contrat-regles-informations). */}
                {((offer.rules?.length ?? 0) > 0 || offer.information) && (
                  <Accordion title={t('offer.rules')} testID="offer-rules">
                    {offer.rules?.map((rule) => (
                      <FactRow key={rule.label} fact={rule} testID="offer-rule" />
                    ))}
                    {offer.information && (
                      <ThemedText type="small" style={styles.information} testID="offer-information">
                        {offer.information}
                      </ThemedText>
                    )}
                  </Accordion>
                )}

                {notice && (
                  <ThemedText
                    type="small"
                    style={notice.failed ? styles.error : { color: theme.primary }}
                    accessibilityRole="alert"
                    testID="offer-notice">
                    {notice.message}
                  </ThemedText>
                )}

                {offer.reviews && (
                  <Accordion title={t('offer.reviews')} testID="offer-reviews-block">
                    <OfferReviews offerId={offer.id} reviews={offer.reviews} onChanged={changed} />
                  </Accordion>
                )}

                {offer.published_at && (
                  <ThemedText type="small" themeColor="textSecondary" testID="offer-published">
                    {t('offer.publishedOn', { date: new Date(offer.published_at).toLocaleDateString(locale, { dateStyle: 'long' }) })}
                  </ThemedText>
                )}
              </View>
            </ScrollView>
          )}
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Une ligne « libellé — valeur », des caractéristiques comme des règles. */
function FactRow({ fact, testID }: { fact: { label: string; value: string }; testID: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.fact, { borderBottomColor: theme.backgroundSelected }]} testID={testID}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.factLabel}>
        {fact.label}
      </ThemedText>
      {/* Une valeur longue (les équipements) passe à la ligne ; le libellé reste visible. */}
      <ThemedText type="small" style={styles.factValue}>
        {fact.value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  centered: { textAlign: 'center' },
  content: { paddingBottom: Spacing.five },
  body: { width: '100%', alignSelf: 'center', gap: Spacing.two, padding: Spacing.four },
  section: { gap: Spacing.one, marginTop: Spacing.three },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: 1 },
  // Le séparateur à la fin du bloc « Localisation ».
  location: { gap: Spacing.one, paddingBottom: Spacing.two, borderBottomWidth: 1 },
  factLabel: { flexShrink: 0, maxWidth: '45%' },
  factValue: { flexShrink: 1, textAlign: 'right' },
  information: { paddingTop: Spacing.two },
  error: { color: ERROR_COLOR },
});
