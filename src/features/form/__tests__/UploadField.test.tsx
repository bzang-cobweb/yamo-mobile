import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useState } from 'react';

import { ApiError } from '@/shared/api/errors';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { FormField } from '../components/FormField';
import { formService } from '../services/FormService';
import type { FormFieldDefinition } from '../types';
import { hasPendingUploads, initialValue } from '../utils/values';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const picker = launchImageLibraryAsync as jest.Mock;

function field(overrides: Partial<FormFieldDefinition['upload']> = {}): FormFieldDefinition {
  return {
    name: 'photos',
    type: 'upload',
    label: 'Photos',
    placeholder: null,
    help: null,
    required: true,
    default: ['old'],
    options: [],
    upload: {
      accept: ['image/jpeg', 'image/png'],
      max_size_kb: 100,
      max_files: 3,
      endpoint: '/v1/forms/offer.offer/uploads/photos',
      files: [{ id: 'old', url: 'http://api.test/old.webp' }],
      ...overrides,
    },
  };
}

/** Un fichier choisi : `kb` Ko de contenu. */
function asset(name: string, kb = 1) {
  return {
    uri: `file:///${name}.jpg`,
    base64: 'A'.repeat(Math.round((kb * 1024 * 4) / 3)),
  };
}

/** Le champ avec sa valeur gardée, comme dans un formulaire. */
function Harness({ definition, spy }: { definition: FormFieldDefinition; spy: (value: string[]) => void }) {
  const [value, setValue] = useState(initialValue(definition) as string[]);

  return (
    <FormField
      field={definition}
      value={value}
      onChange={(next) => {
        spy(next as string[]);
        setValue(next as string[]);
      }}
    />
  );
}

async function show(definition = field()) {
  const spy = jest.fn();
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <Harness definition={definition} spy={spy} />
    </I18nContext.Provider>,
  );

  return spy;
}

describe('UploadField (type « upload »)', () => {
  beforeEach(() => {
    picker.mockReset();
    jest.restoreAllMocks();
  });

  it('part des fichiers déjà enregistrés ; la première est la principale', async () => {
    await show();

    expect(initialValue(field())).toEqual(['old']);
    expect(screen.getByText('Principale')).toBeTruthy();
    expect(screen.getByTestId('field-photos-add')).toBeTruthy();
  });

  it('envoie chaque photo choisie et met son identifiant dans la valeur, dans l’ordre', async () => {
    const upload = jest.spyOn(formService, 'upload').mockResolvedValueOnce('id-a').mockResolvedValueOnce('id-b');
    picker.mockResolvedValue({
      canceled: false,
      assets: [asset('a'), asset('b')],
    });
    const spy = await show();

    await fireEvent.press(screen.getByTestId('field-photos-add'));

    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(['old', 'id-a', 'id-b']));
    expect(upload).toHaveBeenCalledWith('/v1/forms/offer.offer/uploads/photos', expect.objectContaining({ type: 'image/jpeg' }));
    // Galerie seulement, au plus les places restantes.
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 2,
      }),
    );
    // Pendant l'envoi, la valeur tient une place provisoire : le formulaire attend.
    expect(hasPendingUploads({ photos: spy.mock.calls[0][0] })).toBe(true);
    expect(hasPendingUploads({ photos: ['old', 'id-a'] })).toBe(false);
  });

  it('applique les limites servies par Laravel avant l’envoi : taille et nombre', async () => {
    const upload = jest.spyOn(formService, 'upload').mockResolvedValue('id-a');
    picker.mockResolvedValue({
      canceled: false,
      assets: [asset('lourde', 200), asset('a'), asset('b')],
    });
    const spy = await show();

    await fireEvent.press(screen.getByTestId('field-photos-add'));

    // 3 au plus avec celle déjà là : la 3ᵉ choisie est écartée ; la lourde est refusée.
    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(['old', 'id-a']));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('photos-error').props.children).toBe('Au plus 3 fichiers.');
  });

  it('un type que Laravel n’accepte pas est refusé sans envoi', async () => {
    const upload = jest.spyOn(formService, 'upload');
    picker.mockResolvedValue({ canceled: false, assets: [asset('a')] });
    await show(field({ accept: ['image/webp'] }));

    await fireEvent.press(screen.getByTestId('field-photos-add'));

    await waitFor(() => expect(screen.getByTestId('photos-error').props.children).toBe('Format non accepté.'));
    expect(upload).not.toHaveBeenCalled();
  });

  it('un envoi refusé par le serveur retire la photo et affiche son message', async () => {
    jest.spyOn(formService, 'upload').mockRejectedValue(new ApiError(422, 'Invalide', { file: ['Le fichier est trop lourd.'] }));
    picker.mockResolvedValue({ canceled: false, assets: [asset('a')] });
    const spy = await show();

    await fireEvent.press(screen.getByTestId('field-photos-add'));

    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(['old']));
    expect(screen.getByTestId('photos-error').props.children).toBe('Le fichier est trop lourd.');
  });

  it('retirer une photo, en mettre une autre en premier', async () => {
    jest.spyOn(formService, 'upload').mockResolvedValue('id-a');
    picker.mockResolvedValue({ canceled: false, assets: [asset('a')] });
    const spy = await show();
    await fireEvent.press(screen.getByTestId('field-photos-add'));
    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(['old', 'id-a']));

    await fireEvent.press(screen.getByTestId('field-photos-main-1'));
    expect(spy).toHaveBeenLastCalledWith(['id-a', 'old']);

    await fireEvent.press(screen.getByTestId('field-photos-remove-1'));
    expect(spy).toHaveBeenLastCalledWith(['id-a']);
  });

  it('sans place restante, plus de bouton d’ajout ; annuler ne change rien', async () => {
    picker.mockResolvedValue({ canceled: true, assets: null });
    const spy = await show(field({ max_files: 2 }));
    await act(async () => {
      await fireEvent.press(screen.getByTestId('field-photos-add'));
    });
    expect(spy).not.toHaveBeenCalled();

    // Une photo déjà là, une seule permise : plus d'ajout possible.
    await show(field({ max_files: 1 }));
    expect(screen.queryByTestId('field-photos-add')).toBeNull();
  });
});
