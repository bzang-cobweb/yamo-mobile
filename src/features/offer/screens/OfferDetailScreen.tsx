import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/hooks/useAuth';
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
import type { OfferDetail } from '../types';

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
                {/* Le prix n'est plus ici : il est dans la barre fixe (décision 2026-11-19-contrat-reservations). */}

                {/* Puis la description, la localisation, les caractéristiques. */}
                {/* La description seule, sans titre (décision 2026-11-19-fiche-description-equipements). */}
                {offer.description && (
                  <View style={styles.section}>
                    <ThemedText testID="offer-description">{offer.description}</ThemedText>
                  </View>
                )}

                {/* Les sections repliables, dans l'ordre et l'ouverture servis par Laravel
                    (décision 2026-11-19-sections-fiche-laravel) ; une clé inconnue est ignorée. */}
                {(offer.sections ?? []).map((section) => {
                  switch (section.key) {
                    // L'adresse complète, pays compris, et son indication (décision 2026-11-19-fiche-localisation).
                    case 'location':
                      return offer.address ? (
                        <Accordion key={section.key} title={t('offer.location')} initiallyOpen={section.open} testID="offer-location-block">
                          <View style={[styles.location, { borderBottomColor: theme.backgroundSelected }]}>
                            <ThemedText testID="offer-address">{offer.address}</ThemedText>
                            {offer.indication && (
                              <ThemedText type="small" themeColor="textSecondary" testID="offer-indication">
                                {offer.indication}
                              </ThemedText>
                            )}
                          </View>
                        </Accordion>
                      ) : null;
                    case 'facts':
                      return (
                        <Accordion key={section.key} title={t('offer.details')} initiallyOpen={section.open} testID="offer-facts">
                          {offer.facts.map((fact) => (
                            <FactRow key={fact.label} fact={fact} testID="offer-fact" />
                          ))}
                        </Accordion>
                      );
                    // Règles (décision 2026-11-19-contrat-regles-informations).
                    case 'rules':
                      return (
                        <Accordion key={section.key} title={t('offer.rules')} initiallyOpen={section.open} testID="offer-rules">
                          {offer.rules?.map((rule) => (
                            <FactRow key={rule.label} fact={rule} testID="offer-rule" />
                          ))}
                        </Accordion>
                      );
                    // Un bloc d'informations par section, titrée par son titre (décision 2026-11-19-contrat-offer-informations).
                    case 'informations':
                      return (offer.informations ?? []).map((information) => (
                        <Accordion
                          key={`information-${information.id}`}
                          title={information.title}
                          initiallyOpen={section.open}
                          testID={`offer-information-${information.id}`}>
                          <ThemedText type="small" style={styles.information} testID="offer-information">
                            {information.description}
                          </ThemedText>
                        </Accordion>
                      ));
                    case 'reviews':
                      return offer.reviews ? (
                        <Accordion key={section.key} title={t('offer.reviews')} initiallyOpen={section.open} testID="offer-reviews-block">
                          <OfferReviews offerId={offer.id} reviews={offer.reviews} onChanged={changed} />
                        </Accordion>
                      ) : null;
                    default:
                      return null;
                  }
                })}

                {/* Le message d'un avis donné ou retiré. */}
                {notice && (
                  <ThemedText
                    type="small"
                    style={notice.failed ? styles.error : { color: theme.primary }}
                    accessibilityRole="alert"
                    testID="offer-notice">
                    {notice.message}
                  </ThemedText>
                )}

                {offer.published_at && (
                  <ThemedText type="small" themeColor="textSecondary" testID="offer-published">
                    {t('offer.publishedOn', { date: new Date(offer.published_at).toLocaleDateString(locale, { dateStyle: 'long' }) })}
                  </ThemedText>
                )}
              </View>
            </ScrollView>
          )}
          {/* Barre fixe en bas : le prix et le bouton de réservation (décision 2026-11-19-contrat-reservations). */}
          {offer && (offer.price || offer.booking) && <BookingBar offer={offer} />}
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Le prix à gauche, le bouton à droite (« Réserver », « Demander une visite »). Un
 * visiteur passe d'abord par la connexion ; un membre ouvre le formulaire décrit par
 * Laravel, lié à l'offre. Sa propre offre : le prix seul.
 */
function BookingBar({ offer }: { offer: OfferDetail }) {
  const theme = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const booking = offer.booking;

  return (
    <View
      testID="offer-booking-bar"
      style={[styles.bar, { borderTopColor: theme.backgroundSelected, backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      <View style={[styles.barContent, { maxWidth: MaxContentWidth / 2 }]}>
        <View style={styles.barPrice}>
          {offer.price && (
            <ThemedText type="smallBold" style={{ color: theme.primary }} testID="offer-price">
              {offer.price.value}
            </ThemedText>
          )}
        </View>
        {booking && (
          <Pressable
            testID="offer-booking"
            accessibilityRole="button"
            onPress={() =>
              user === null ? router.push('/sign-in') : router.push({ pathname: '/offers/[id]/book', params: { id: offer.id } })
            }
            style={({ pressed }) => [styles.bookButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {booking.label}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
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
  information: { paddingTop: Spacing.one },
  error: { color: ERROR_COLOR },
  bar: { borderTopWidth: 1, paddingTop: Spacing.three, paddingHorizontal: Spacing.four },
  barContent: { width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  barPrice: { flex: 1 },
  bookButton: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, borderRadius: 12, alignItems: 'center' },
  pressed: { opacity: 0.7 },
});
