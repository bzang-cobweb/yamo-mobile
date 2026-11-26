jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

import { profileFormLink } from '../components/ProfileFormSheet';

describe('profileFormLink (décision 2026-11-26-formulaires-en-panneau)', () => {
  it('lit le formulaire et son enregistrement', () => {
    expect(profileFormLink('/profile/offer.booking.cancel?record=9')).toEqual({ form: 'offer.booking.cancel', record: '9' });
    expect(profileFormLink('/profile/notifications.settings')).toEqual({ form: 'notifications.settings', record: undefined });
  });

  it("ne reconnaît pas les autres liens", () => {
    expect(profileFormLink('/offers/5/review')).toBeNull();
    expect(profileFormLink('/profile/lists/addresses')).toBeNull();
    expect(profileFormLink('/profile')).toBeNull();
  });
});
