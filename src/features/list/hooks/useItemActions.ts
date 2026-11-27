import { router, type Href } from 'expo-router';
import { Alert } from 'react-native';

import { profileFormService, profileSubmission } from '@/features/auth/services/ProfileFormService';
import { ApiError } from '@/shared/api/errors';
import { showToast } from '@/shared/components/Toast';
import { useI18n } from '@/shared/i18n/I18nContext';

import { ITEM_LINK } from '../services/ListService';
import type { ListItemAction } from '../types';
import { setFilterValues } from '../utils/filters';

/** Un écran de l'app (« /notifications »), sans identifiant. */
const APP_SCREEN = /^\/[a-z][a-z0-9/_-]*$/;

type Options = {
  /** Après un envoi, réussi ou non : recharger ce qui l'affiche. */
  onDone: () => Promise<unknown> | void;
  /** Ouvrir le panneau d'une action (`panel`, décision 2026-11-27-action-panneau) ; absent : l'action ne fait rien. */
  onPanel?: (action: ListItemAction) => void;
};

/**
 * Le geste d'un bouton de carte : demander confirmation s'il en a une, puis ouvrir
 * son panneau (`panel`), son formulaire, son écran (`link`), ou envoyer sa requête. Le message de l'envoi,
 * réussite ou erreur (celle de l'API, « Ces dates chevauchent… », sinon générique), va dans
 * le bandeau flottant (décision 2026-11-21-bandeau-messages).
 */
export function useItemActions({ onDone, onPanel }: Options) {
  const { t } = useI18n();

  async function run(action: ListItemAction) {
    // Un panneau de l'app, par-dessus la liste (« Statistiques » d'un partenaire).
    if (action.panel) {
      onPanel?.(action);

      return;
    }
    if (action.form) {
      router.push({ pathname: '/profile/[form]', params: { form: action.form.form, record: action.form.record } });

      return;
    }
    // Une liste avec ses filtres déjà choisis, sans écran à part (« Demandes » d'un logement, la liste des demandes
    // reçues, ce logement choisi : décision 2026-11-21-demandes-comme-mes-reservations).
    if (!action.link && action.list && action.filter) {
      setFilterValues(action.list, action.filter);
      router.push({ pathname: '/profile/lists/[list]', params: { list: action.list } });

      return;
    }
    if (action.link) {
      // Un écran avec ses filtres déjà choisis (« Notifications » d'un logement, décision 2026-11-21-lien-notifications) :
      // les filtres d'abord, puis l'écran, un onglet que l'on rejoint.
      if (action.filter && action.list && APP_SCREEN.test(action.link)) {
        setFilterValues(action.list, action.filter);
        router.navigate(action.link as Href);
      } else if (ITEM_LINK.test(action.link)) {
        router.push(action.link as Href);
      }

      return;
    }
    const submission = action.submission ? profileSubmission({ ...action.submission, label: action.label }) : null;

    if (submission === null) {
      return;
    }

    try {
      await profileFormService.submit(submission, {});
      showToast(submission.success.message);
    } catch (error) {
      showToast(error instanceof ApiError ? (Object.values(error.errors)[0]?.[0] ?? error.message) : t('error.unknown'), 'danger');
    }

    await onDone();
  }

  function press(action: ListItemAction) {
    if (action.confirm) {
      Alert.alert(action.confirm, undefined, [
        { text: t('list.cancel'), style: 'cancel' },
        { text: action.label, style: action.style === 'destructive' ? 'destructive' : 'default', onPress: () => void run(action) },
      ]);
    } else {
      void run(action);
    }
  }

  return { press };
}
