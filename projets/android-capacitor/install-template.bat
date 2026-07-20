@echo off
chcp 65001 >nul
title Installation du template PharmAtlas Capacitor

echo.
echo ============================================
echo  INSTALLATION PHARMATLAS CAPACITOR
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERREUR : Node.js n'est pas installe ou pas dans le PATH.
  echo Installe Node.js LTS puis relance ce fichier.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERREUR : npm n'est pas disponible.
  pause
  exit /b 1
)

echo Installation des dependances npm...
call npm install
if errorlevel 1 (
  echo.
  echo ERREUR pendant npm install.
  pause
  exit /b 1
)

if not exist android (
  echo.
  echo Ajout de la plateforme Android...
  call npx cap add android
) else (
  echo.
  echo Le dossier android existe deja : on ne le recree pas.
)

echo.
echo Synchronisation...
call npx cap sync android

echo.
echo Termine.
echo Tu peux maintenant lancer sync-open-android.bat ou build-apk.bat.
pause
