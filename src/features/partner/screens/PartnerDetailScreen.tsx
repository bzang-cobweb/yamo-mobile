import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/shared/components/BackHeader';
import { FixedButtonBar } from '@/shared/components/FixedButtonBar';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedView } from '@/shared/theme/components/themed-view';

import { PartnerDetails } from '../components/PartnerDetails';
import { usePartner } from '../hooks/usePartners';
import { partnerService } from '../services/PartnerService';
import { openPartner } from '../utils/openPartner';

/**
 * La page d'un partenaire (décision 2026-11-23-partenaires-liste-detail) : sa fiche (`PartnerDetails`, commune avec le
 * panneau « Info » d'une notification de partenaire) ; en bas, son bouton (son libellé, sinon « Visiter le site »), qui
 * compte un clic et ouvre son lien. Sans lien, pas de bouton.
 */
export function PartnerDetailScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const query = usePartner(id);
  // Ouvrir sa page, par n'importe quel lien, compte un clic ; l'API ne le compte pas pour ses comptes (décision
  // 2026-11-25-clic-a-l-ouverture). Une fois par ouverture ; une erreur réseau ne gêne pas la page.
  useEffect(() => {
    void partnerService.click(id).catch(() => undefined);
  }, [id]);
  const partner = query.data;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={partner?.name ?? t('partners.title')} />
          <PartnerDetails id={id} />
          {partner?.website && <FixedButtonBar testID="partner-cta" label={partner.cta_label ?? t('partners.visit')} onPress={() => openPartner(partner)} />}
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
