import type { FormFieldDefinition } from '../types';
import { dependentOptions } from '../utils/values';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

const status: FormFieldDefinition = {
  name: 'status',
  type: 'select',
  label: 'Statut',
  placeholder: null,
  help: null,
  required: false,
  default: null,
  depends_on: 'type',
  options: [
    { value: 'accepted', label: 'Acceptée', parent: 'booking' },
    { value: 'refused', label: 'Refusée', parent: 'booking' },
    { value: 'partner_published', label: 'Publié', parent: 'partner' },
  ],
};

describe('dependentOptions (décision 2026-11-26-filtre-type-en-puces)', () => {
  it('un parent choisi : ses options', () => {
    expect(dependentOptions(status, { type: 'booking' }).map((option) => option.value)).toEqual(['accepted', 'refused']);
  });

  it('un parent en puces : les options de chaque valeur choisie', () => {
    expect(dependentOptions(status, { type: ['partner'] }).map((option) => option.value)).toEqual(['partner_published']);
    expect(dependentOptions(status, { type: ['booking', 'partner'] }).map((option) => option.value)).toEqual(['accepted', 'refused', 'partner_published']);
  });

  it('rien de choisi : aucune option', () => {
    expect(dependentOptions(status, { type: [] })).toEqual([]);
    expect(dependentOptions(status, {})).toEqual([]);
  });
});
