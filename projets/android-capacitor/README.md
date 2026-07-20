# Template Capacitor — PharmAtlas

Ce dossier permet de convertir rapidement une page HTML autonome en application Android avec Capacitor.

## Utilisation rapide

1. Décompresse ce dossier.
2. Mets ton fichier HTML principal dans le dossier `www/`.
3. Renomme-le exactement : `index.html`.
4. Double-clique sur `install-template.bat` une première fois.
5. Double-clique sur `sync-open-android.bat`.
6. Dans Android Studio : `Build > Build Bundle(s) / APK(s) > Build APK(s)`.

L'APK sera généré ici :

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Scripts fournis

### install-template.bat

À lancer une seule fois au début.  
Il installe les dépendances npm, ajoute Android si besoin, puis synchronise.

### remplacer-index-html.bat

Permet de remplacer facilement `www/index.html` par un autre fichier HTML.

### sync-open-android.bat

À utiliser après chaque modification du dossier `www/`.  
Il fait :

```text
npx cap sync android
npx cap open android
```

### build-apk.bat

Essaie de générer directement l'APK en ligne de commande.

Si tu obtiens une erreur `JAVA_HOME is not set`, utilise plutôt `sync-open-android.bat`, puis construis l'APK depuis Android Studio.

## Modifier le nom de l'application

Dans `capacitor.config.ts`, modifie :

```ts
appName: 'PharmAtlas'
```

## Modifier l'identifiant Android

Dans `capacitor.config.ts`, modifie :

```ts
appId: 'fr.pharmatlas.app'
```

Exemples valides :

```text
fr.pharmatlas.toxiques
fr.pharmatlas.pharmacognosie
fr.pharmatlas.chromatographie
```

Attention : pas de slash `/`, pas d'espace, pas d'accent.
