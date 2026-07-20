@echo off
chcp 65001 >nul
title Synchronisation et ouverture Android Studio

echo.
echo ============================================
echo  SYNC + OUVERTURE ANDROID STUDIO
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

echo Synchronisation des fichiers web vers Android...
call npx cap sync android
if errorlevel 1 (
  echo.
  echo ERREUR pendant npx cap sync android.
  pause
  exit /b 1
)

echo Ouverture dans Android Studio...
call npx cap open android

echo.
echo Dans Android Studio :
echo Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
pause
