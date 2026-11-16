import type { FieldProps, FieldValue } from '../types';
import { CheckboxField } from './fields/CheckboxField';
import { CheckboxGroupField } from './fields/CheckboxGroupField';
import { DateField } from './fields/DateField';
import { NumberField } from './fields/NumberField';
import { RadioField } from './fields/RadioField';
import { SelectField } from './fields/SelectField';
import { SwitchField } from './fields/SwitchField';
import { TextareaField } from './fields/TextareaField';
import { TextField } from './fields/TextField';

/**
 * Sert le bon composant selon le `type` du champ envoyé par l'API
 * (décision 2026-11-15-contrat-mobile-features-formulaires). Ajouter un type :
 * un cas ici et son composant dans `fields/`.
 */
export function FormField({ field, value, onChange, error, disabled, onSubmitEditing }: FieldProps<FieldValue>) {
  const common = { field, error, disabled };
  const asText = typeof value === 'string' ? value : '';
  const asBoolean = value === true;
  const asList = Array.isArray(value) ? value : [];

  switch (field.type) {
    case 'text':
    case 'hidden':
    case 'email':
    case 'password':
      return <TextField {...common} value={asText} onChange={onChange} onSubmitEditing={onSubmitEditing} />;
    case 'number':
      return <NumberField {...common} value={asText} onChange={onChange} />;
    case 'textarea':
      return <TextareaField {...common} value={asText} onChange={onChange} />;
    case 'select':
      return <SelectField {...common} value={asText} onChange={onChange} />;
    case 'radio':
      return <RadioField {...common} value={asText} onChange={onChange} />;
    case 'checkbox':
      return <CheckboxField {...common} value={asBoolean} onChange={onChange} />;
    case 'checkbox_group':
      return <CheckboxGroupField {...common} value={asList} onChange={onChange} />;
    case 'date':
      return <DateField {...common} value={asText} onChange={onChange} />;
    case 'switch':
      return <SwitchField {...common} value={asBoolean} onChange={onChange} />;
    default: {
      // Type inconnu de cette version de l'app : rien n'est affiché plutôt qu'un champ faux.
      const unknown: never = field.type;
      console.warn(`Type de champ non pris en charge : ${String(unknown)}`);

      return null;
    }
  }
}
