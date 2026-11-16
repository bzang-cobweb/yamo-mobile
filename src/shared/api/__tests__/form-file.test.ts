import { base64ToBytes, formFileFromBase64 } from '../form-file';

describe('form-file', () => {
  it('décode le Base64 en octets', () => {
    expect(Array.from(base64ToBytes('/9j/'))).toEqual([0xff, 0xd8, 0xff]);
  });

  it('donne une pièce lisible par `bytes()`, avec son nom et son type (forme lue par expo/fetch)', async () => {
    const file = formFileFromBase64('avatar.jpg', 'image/jpeg', '/9j/');

    expect(file).toMatchObject({ name: 'avatar.jpg', type: 'image/jpeg' });
    expect(Array.from(await file.bytes())).toEqual([0xff, 0xd8, 0xff]);
  });
});
