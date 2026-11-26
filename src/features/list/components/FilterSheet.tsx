import { BottomSheet } from '@/shared/components/BottomSheet';
import { useI18n } from '@/shared/i18n/I18nContext';

import { FilterForm } from '../screens/FilterScreen';

/**
 * Les filtres d'une liste dans le panneau qui monte du bas (décisions 2026-11-25-filtres-en-panneau et
 * 2026-11-26-bottom-sheet) : les champs qui défilent, puis « Effacer » et « Appliquer ». Les champs repartent des
 * filtres en cours à chaque ouverture.
 */
export function FilterSheet({ list, visible, onClose }: { list: string; visible: boolean; onClose: () => void }) {
  const { t } = useI18n();

  return (
    <BottomSheet visible={visible} title={t('list.filters')} onClose={onClose} testID="filter-sheet">
      {/* Monté à l'ouverture seulement : les champs partent des filtres en cours. */}
      {visible && <FilterForm list={list} onDone={onClose} />}
    </BottomSheet>
  );
}
