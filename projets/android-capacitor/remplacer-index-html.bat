@echo off
chcp 65001 >nul
title Remplacer le HTML principal

echo.
echo ============================================
echo  REMPLACER LE FICHIER HTML PRINCIPAL
echo ============================================
echo.
echo Glisse ton fichier HTML sur cette fenetre puis appuie sur Entree.
echo Exemple : C:\Users\Zacbov\Downloads\monoutil.html
echo.
set /p SOURCE=Chemin du fichier HTML : 

set SOURCE=%SOURCE:"=%

if not exist "%SOURCE%" (
  echo.
  echo ERREUR : fichier introuvable.
  pause
  exit /b 1
)

if not exist www (
  mkdir www
)

copy /Y "%SOURCE%" "www\index.html"

echo.
echo Fichier copie dans www\index.html
echo Lance maintenant sync-open-android.bat ou build-apk.bat
pause
