import { useQuery } from '@tanstack/react-query';
import { useCallback, useContext } from 'react';

import { AuthContext } from '@/features/auth/context/AuthContext';
import { useI18n } from '@/shared/i18n/I18nContext';

import { offerService } from '../services/OfferService';

/**
 * Le bloc « Récemment consultés » de l'accueil (décision 2026-11-27-listes-de-favoris) : seulement pour un membre
 * connecté ; propre à chaque compte. L'écran le recharge (`reload`) à chaque retour (une fiche ouverte entre-temps).
 */
export function useHomeRecent() {
  const { locale } = useI18n();
  // Sans fournisseur (tests) : aucun compte.
  const userId = useContext(AuthContext)?.user?.id ?? null;

  const query = useQuery({ queryKey: ['home-recent', locale, userId], queryFn: () => offerService.recent(), enabled: userId !== null });
  const { refetch } = query;
  // `refetch` passe outre `enabled` : sans compte, rien (un visiteur recevrait un 401).
  const reload = useCallback(async () => {
    if (userId !== null) {
      await refetch();
    }
  }, [userId, refetch]);

  return { ...query, reload };
}
