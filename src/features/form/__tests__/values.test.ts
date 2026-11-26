import type { FormFieldDefinition } from '../types';
import { isVisible } from '../utils/values';

function field(visibleWhen: FormFieldDefinition['visible_when']): FormFieldDefinition {
  return { name: 'offer', type: 'select', label: 'Logement', placeholder: null, help: null, required: false, default: null, options: [], visible_when: visibleWhen };
}

describe('isVisible (champ conditionnel)', () => {
  it('une liste (des puces) : rien de choisi vaut « vide » ; sinon chaque choix doit être attendu (décision 2026-11-26-filtres-en-puces)', () => {
    const availableFrom = field({ field: 'rental_type', value: '', values: ['', 'long_term', 'shared'] });

    expect(isVisible(availableFrom, { rental_type: [] })).toBe(true);
    expect(isVisible(availableFrom, { rental_type: ['long_term', 'shared'] })).toBe(true);
    expect(isVisible(availableFrom, { rental_type: ['long_term', 'furnished'] })).toBe(false);
  });

  it('une seule valeur : affiché quand le champ la vaut', () => {
    const offer = field({ field: 'type', value: 'a' });

    expect(isVisible(offer, { type: 'a' })).toBe(true);
    expect(isVisible(offer, { type: 'b' })).toBe(false);
  });

  it('une liste de valeurs : affiché pour l’une d’elles, masqué sans valeur (« Logement » pour un type de demande)', () => {
    const offer = field({ field: 'type', value: 'a', values: ['a', 'b'] });

    expect(isVisible(offer, { type: 'b' })).toBe(true);
    expect(isVisible(offer, { type: 'c' })).toBe(false);
    expect(isVisible(offer, {})).toBe(false);
  });

  it('sans condition : toujours affiché', () => {
    expect(isVisible(field(null), {})).toBe(true);
  });
});
