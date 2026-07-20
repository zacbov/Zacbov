@echo off
chcp 65001 >nul
title Build APK debug PharmAtlas

echo.
echo ============================================
echo  BUILD APK DEBUG PHARMATLAS
echo ============================================
echo.

if not exist package.json (
  echo ERREUR : package.json introuvable.
  echo Lance ce fichier depuis le dossier du projet Capacitor.
  pause
  exit /b 1
)

if not exist www\index.html (
  echo ERREUR : www\index.html introuvable.
  echo Copie ton fichier HTML dans www et renomme-le index.html.
  pause
  exit /b 1
)

if not exist node_modules (
  echo node_modules absent : installation npm...
  call npm install
)

if not exist android (
  echo Dossier android absent : ajout Android...
  call npx cap add android
)

echo Synchronisation Capacitor...
call npx cap sync android
if errorlevel 1 (
  echo.
  echo ERREUR pendant la synchronisation.
  pause
  exit /b 1
)

echo.
echo Construction de l'APK debug...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (
  echo.
  echo ERREUR pendant la construction APK.
  echo Si JAVA_HOME est manquant, ouvre plutot Android Studio avec sync-open-android.bat.
  cd ..
  pause
  exit /b 1
)
cd ..

echo.
echo APK genere ici :
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
