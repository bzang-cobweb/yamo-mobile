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
| `src/features/auth/` | Session et profil : `LoginService`, `LogoutService`, `ProfileService` (consultation, photo), `ProfileMenuService` (menu du profil), `ProfileFormService` (envoi de tout formulaire du profil, décrit par l'API), `AuthProvider`, `useAuth()`, écrans Connexion, Accueil, Profil et ses formulaires |
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
`number`, `textarea`, `select`, `radio`, `checkbox`, `checkbox_group`, `switch`, `date`
(`DateField` : sélecteur natif `@react-native-community/datetimepicker`, valeur
`AAAA-MM-JJ` en heure locale, « Effacer » pour une date facultative). Chaque champ porte
`required` (astérisque, et règle `required`/`nullable` côté API). Une définition de
formulaire n'est pas gardée en mémoire une fois le formulaire fermé : rouvert, il montre
les valeurs à jour du compte. Ajouter
un type : un cas dans le `switch` de `FormField` et son composant dans `fields/`.

### Pays

Le pays est l'« espace » de l'app (`src/features/country`). L'écran d'entrée
(`EntryScreen`) s'affiche tant que la langue et le pays ne sont pas choisis :
le sélecteur de langue au-dessus du logo (invité), le logo, la description de
l'application, puis le sélecteur de pays (`EntrySelect`), avec recherche, parmi
ceux servis par `GET /api/v1/countries` (un seul : montré choisi). « Entrer »
garde les deux sur l'appareil ; ensuite on entre directement, sauf si ce pays a
été fermé. Chaque requête porte `X-Country`.

### Accueil

La barre du haut (`AppTopBar`) est la même pour un visiteur et un membre : le
logo à gauche, puis la langue (`LocaleSwitcher` : appareil pour un visiteur,
compte pour un membre) et le drapeau (`CountrySwitcher`), qui ouvre la liste des
pays avec recherche ; changer de pays recharge les données sans déconnecter.
Dessous, les offres publiées du pays (`BrowseScreen`, liste `offer.browse`,
ouverte sans connexion). Un visiteur (`GuestHomeScreen`) a en bas « Se
connecter » et « Créer un compte ». Toucher une offre ouvre sa fiche
(`/offers/[id]`, `OfferDetailScreen`), décrite par `GET /api/v1/offers/{id}` :
photos en carrousel, titre, prix, ville, caractéristiques, description.

### Navigation

Connecté : menu fixe en bas, deux icônes — Accueil (écran par défaut, `src/app/(tabs)/index.tsx`)
et Profil (pile `src/app/(tabs)/profile/`). Le profil affiche la photo, le nom, l'e-mail, le
menu servi par l'API (`GET /api/v1/auth/me/menu` : libellé, et nom du formulaire ou de la
liste de chaque lien), « Se déconnecter » et le lien rouge « Supprimer mon compte ». Un lien
`form` ouvre `/profile/[form]` (`ProfileFormScreen`), qui affiche et envoie le formulaire selon sa
définition : méthode et point d'API (`/v1/…` seulement), étape du code si l'API en demande
un, compte mis à jour, puis retour au profil avec le message de l'API, retour à la liste, ou
déconnexion. Un lien `list` ouvre `/profile/lists/[list]` (`ProfileListScreen`, liste servie par
`GET /api/v1/lists/{list}`, comme « Mes adresses ») : items, lien de création fixe sous la recherche, formulaire
d'un item (`/profile/[form]?record=…`) et retrait après confirmation. Les items arrivent par
pages : l'API sert `next_cursor`, renvoyé en `?cursor=` pour la suite, chargée en approchant
du bas. L'affichage passe par `List` (`src/shared/components/List.tsx`), composant générique à
défilement infini que toute feature peut utiliser avec ses propres données. Une liste cherchable
(`search` servi par l'API) affiche un champ de recherche : la recherche part 300 ms après la
dernière frappe, en `?search=`, côté serveur. Ajouter un lien, un
formulaire ou une liste au menu ne demande donc aucune modification de l'app. Après l'ajout d'une route, relancer `npx expo start` pour régénérer les routes
typées avant `npm run typecheck`.

Nom complet et initiales (avatar) viennent de l'API (`full_name`, `initials`) : l'app ne
les recalcule pas.

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
- **Écran hors ligne** (`ConnectivityGate`) : l'écran courant ne s'affiche que si
  l'app peut fonctionner. Sans internet, à tout moment (`expo-network`), l'écran hors
  ligne le recouvre sans le démonter : au retour de la connexion, on retrouve son
  écran et sa saisie, et les chargements en attente reprennent d'eux-mêmes. Même
  écran si le démarrage échoue avec internet (serveur arrêté) ; un jeton refusé
  renvoie à la connexion.
- Tester la coupure : couper le Wi-Fi du Mac (le simulateur suit sa connexion).
- Formulaires : titre et sous-titre facultatifs (`title`, `subtitle`) ; l'aide d'un
  champ (`help`) reste affichée sous le champ, l'erreur s'ajoute en dessous, en rouge.
- Exception native : le texte de la demande d'accès aux photos d'iOS est figé au
  build (`photosPermission`, `app.json`) et ne peut pas venir de l'API.

### Langue

Connecté : la langue du compte (modifiable dans Profil). Non connecté : la première des
langues préférées de l'appareil que l'API propose (`GET /api/v1/locales`), sinon le français.

Ajouter une dépendance : `npx expo install <paquet>` (versions compatibles avec le SDK).
