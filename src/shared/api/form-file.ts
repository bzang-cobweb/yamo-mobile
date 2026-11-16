/**
 * Fichier à joindre à un `FormData` envoyé par `ApiClient.postForm`.
 *
 * Le `fetch` global d'Expo (`expo/fetch`) n'accepte pas la forme historique de
 * React Native `{ uri, name, type }` : il lit le contenu d'une pièce par sa méthode
 * `bytes()`. On lui donne donc le contenu lui-même, décodé depuis le Base64 fourni
 * par le sélecteur d'images — sans dépendance supplémentaire.
 */
export type FormFile = {
  name: string;
  type: string;
  bytes: () => Promise<Uint8Array>;
};

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function formFileFromBase64(name: string, type: string, base64: string): FormFile {
  return { name, type, bytes: async () => base64ToBytes(base64) };
}

/** Ajoute le fichier au formulaire (le type DOM de `FormData` ne connaît que `Blob`). */
export function appendFile(form: FormData, field: string, file: FormFile): void {
  form.append(field, file as unknown as Blob);
}
