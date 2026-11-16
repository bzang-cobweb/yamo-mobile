# yamo-mobile

On se ya mo — application mobile (iOS, Android) compagnon du site yamo.

- **Stack** : Expo SDK 58, React Native, TypeScript, Expo Router (routes dans `src/app/`).
- **API** : l'API Laravel du dépôt `yamo-web` ; contrat dans son `openapi.json`.
- **Connexion** : e-mail et mot de passe, jeton Sanctum par appareil, conservé dans
  le stockage chiffré du système (`expo-secure-store`).

## Démarrer

1. Démarrer l'API (dépôt `yamo-web`) : `ddev start`.
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Configurer l'URL de l'API :
   ```bash
   cp .env.example .env
   ```
   `EXPO_PUBLIC_API_URL` — par défaut `http://yamo.ddev.site/api`. Le certificat HTTPS
   local de DDEV n'est pas reconnu par le simulateur : rester en HTTP en local. Sur un
   émulateur Android ou un téléphone, remplacer l'hôte par l'adresse IP de la machine.
4. Lancer l'app :
   ```bash
   npx expo start
   ```
   puis `i` (simulateur iOS), `a` (émulateur Android) ou `w` (navigateur).

Un compte se crée côté API : `ddev artisan auth:create-user` (dépôt `yamo-web`).

### Clavier du simulateur iOS (Mac en suisse romand)

Le simulateur lit les touches du Mac avec la disposition de **son** clavier actif, en
anglais américain par défaut : les lettres passent, pas les caractères spéciaux (`-`
devient `'`, `@` devient `"`). Un mot de passe tapé semble juste mais arrive faux à l'API
(« identifiants incorrects »). Fixer une fois pour toutes la disposition physique sur
« Swiss French », simulateur démarré :

```bash
xcrun simctl spawn booted defaults write .GlobalPreferences AppleKeyboards -array "fr_CH@sw=QWERTZ-Accents;hw=Swiss French" "en_US@sw=QWERTY;hw=Swiss French" "emoji@sw=Emoji"
```

puis redémarrer le simulateur (Device → Restart). En dépannage : coller (⌘V, le
presse-papiers du Mac est partagé) ou utiliser le clavier à l'écran (I/O → Keyboard →
décocher Connect Hardware Keyboard). L'œil du champ mot de passe permet de vérifier la
saisie.

## Vérifier

```bash
npm run typecheck
npm run lint
npm test
```

Les types des routes (Expo Router, routes typées) sont générés par `npx expo start` dans
`.expo/types/` : sur un dépôt fraîchement cloné, lancer `npx expo start` une fois avant
`npm run typecheck`.

## Organisation

Une feature = un dossier dans `src/features/<feature>/`, avec selon ses besoins :
`services/` (une classe par contexte, **une méthode par appel API**), `types/`,
`context/`, `providers/`, `hooks/`, `screens/`, `components/`, `utils/`.

| Dossier | Contenu |
|---|---|
| `src/app/` | Routes Expo Router uniquement : elles importent les écrans des features |
| `src/features/auth/` | Session et profil : `LoginService`, `LogoutService`, `ProfileService`, `AuthProvider`, `useAuth()`, écrans Connexion, Accueil, Profil |
| `src/features/form/` | Formulaires décrits par l'API (`GET /api/v1/forms/{nom}`) : `FormService`, `FormLoader`, `DynamicForm`, un composant par type de champ dans `components/fields/` |
| `src/shared/api/` | `ApiClient` (URL, jeton, langue, erreurs) |
| `src/shared/i18n/` | Textes de l'interface (fr, en), choix de la meilleure langue de l'appareil, `useI18n()` |
| `src/shared/services/` | `LocaleService` (langues proposées par l'API) |
| `src/shared/theme/` | Thème clair/sombre |

### Formulaires

L'app affiche ce que l'API décrit : libellés (déjà traduits), type, options, valeur par
défaut, obligatoire ; les erreurs de validation (422) s'affichent sous chaque champ. Les
règles vivent côté serveur, dans la déclaration du formulaire (module Laravel `Form`).
Types pris en charge : `text`, `hidden`, `email`, `password` (servis par `TextField`),
`number`, `textarea`, `select`, `radio`, `checkbox`, `checkbox_group`, `switch`. Ajouter
un type : un cas dans le `switch` de `FormField` et son composant dans `fields/`.

### Photo de profil

Profil → toucher la photo : **Choisir une photo** (galerie seulement, recadrage carré,
compression JPEG sur le téléphone) ou **Retirer la photo**. Envoi par
`ProfileService.uploadAvatar` (`POST /api/v1/auth/me/avatar`) ; le serveur réduit et
réencode l'image avant de l'enregistrer. Sans photo, `Avatar` affiche les initiales.

**Envoyer un fichier** : le `fetch` global est celui d'Expo (`expo/fetch`), qui **ne lit
pas** la forme React Native `{ uri, name, type }` dans un `FormData` (la requête échoue
avant d'atteindre le serveur, « serveur injoignable »). Joindre un fichier avec
`appendFile` / `formFileFromBase64` (`src/shared/api/form-file.ts`) et l'envoyer par
`apiClient.postForm`, qui ne force pas l'en-tête `Content-Type`.

### Textes de l'interface

**Tous les textes viennent de l'API** (`GET /api/v1/messages`, fichiers
`lang/<langue>/mobile.php` du dépôt `yamo-web`), dans la langue de l'app. Seuls le
message et le bouton de l'écran hors ligne sont écrits dans l'app
(`OFFLINE_MESSAGES`, `src/shared/i18n/messages.ts`) : sans réseau ou serveur
injoignable, l'API ne peut pas les fournir.

- Ajouter un texte : sa clé dans `ApiMessageKey` (`messages.ts`), et son texte en
  **fr et en** dans le `mobile.php` du module concerné côté Laravel. Une clé que
  l'API n'envoie pas s'affiche telle quelle (`home.greeting`) : l'oubli se voit.
- Variables au format Laravel : `:name` (`t('home.greeting', { name })`).
- Démarrage : l'app charge les langues, le compte, puis les textes. Si l'un d'eux
  échoue (pas de réseau, serveur arrêté), elle affiche l'écran hors ligne avec
  Réessayer ; un jeton refusé renvoie à la connexion.
- Formulaires : titre et sous-titre facultatifs (`title`, `subtitle`) ; l'aide d'un
  champ (`help`) reste affichée sous le champ, l'erreur s'ajoute en dessous, en rouge.
- Exception native : le texte de la demande d'accès aux photos d'iOS est figé au
  build (`photosPermission`, `app.json`) et ne peut pas venir de l'API.

### Langue

Connecté : la langue du compte (modifiable dans Profil). Non connecté : la première des
langues préférées de l'appareil que l'API propose (`GET /api/v1/locales`), sinon le français.

Ajouter une dépendance : `npx expo install <paquet>` (versions compatibles avec le SDK).
