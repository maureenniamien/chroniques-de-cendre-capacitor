# Obtenir le .apk — Chroniques de Cendre

Ce dossier est un projet Capacitor prêt à l'emploi (même méthode que tes autres apps :
fichier HTML/JS unique + Capacitor + Codemagic).

## Option A — Le plus simple : GitHub + Codemagic (recommandé, comme d'habitude)

1. Dans Termux, crée un nouveau repo GitHub (ou réutilise un repo existant) et pousse
   tout le contenu de ce dossier dedans :
   ```
   cd chroniques-de-cendre-capacitor
   git init
   git add .
   git commit -m "Chroniques de Cendre - projet Capacitor"
   git branch -M main
   git remote add origin https://github.com/maureenniamien/<ton-repo>.git
   git push -u origin main
   ```

2. Connecte ce repo à Codemagic (comme pour tes autres projets).

3. Dans la configuration Codemagic, choisis un workflow **Capacitor Android** :
   - Build command : `npm install && npx cap sync android && npx cap add android`
     (si le dossier `android/` n'existe pas encore dans le repo, ajoute
     `npx cap add android` avant le sync — sinon juste `npx cap sync android`)
   - Puis le build Gradle standard (`./gradlew assembleDebug` pour un APK de test,
     ou `assembleRelease` + signature pour la version à publier)

4. Codemagic te génère le `.apk` en fin de build — télécharge-le directement
   depuis l'interface Codemagic sur ton téléphone.

## Option B — En local dans Termux (si tu as déjà l'Android SDK configuré)

```
pkg install nodejs openjdk-17 gradle
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

L'APK sera dans `android/app/build/outputs/apk/debug/app-debug.apk`.

## Important avant de publier

- `appId` actuel dans `capacitor.config.json` : `com.mondonjon.chroniquesdecendre`
  — change-le si tu veux un autre identifiant de package.
- Pour publier (pas juste tester), il faudra signer l'APK avec une clé de
  release — Codemagic peut gérer ça automatiquement si tu lui donnes ton
  keystore, comme pour tes autres apps.
