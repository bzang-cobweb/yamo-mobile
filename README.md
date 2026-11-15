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
```

## Organisation

| Dossier | Contenu |
|---|---|
| `src/app/` | Écrans (Expo Router) : `sign-in`, `index` (accueil, connecté) |
| `src/auth/` | Contexte d'authentification : jeton, utilisateur, connexion, déconnexion |
| `src/lib/` | Client de l'API, stockage du jeton |
| `src/i18n.ts` | Textes en français et en anglais (langue du compte, sinon de l'appareil) |
| `src/components/`, `src/constants/`, `src/hooks/` | Thème clair/sombre |

Ajouter une dépendance : `npx expo install <paquet>` (versions compatibles avec le SDK).
