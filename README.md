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

### Langue

Connecté : la langue du compte (modifiable dans Profil). Non connecté : la première des
langues préférées de l'appareil que l'API propose (`GET /api/v1/locales`), sinon le français.

Ajouter une dépendance : `npx expo install <paquet>` (versions compatibles avec le SDK).
