@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title HistoViewer
cd /d "%~dp0"

:: ── Vérifier que le venv existe ──────────────────────────────────────────
if not exist "%~dp0.venv\Scripts\python.exe" (
    echo  ✗ Environnement virtuel introuvable.
    echo    Lancez d'abord install.bat
    echo.
    pause
    exit /b 1
)

set "VENV_PY=%~dp0.venv\Scripts\python.exe"

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║              HistoViewer                         ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: ── Choix du dossier ─────────────────────────────────────────────────────
echo  Dossier de lames :
echo  [1] Dossier courant  (%CD%)
echo  [2] Choisir un dossier...
echo  [3] Entrer un chemin manuellement
echo.
set /p "CHOIX=  Votre choix (1/2/3) : "

if "%CHOIX%"=="2" (
    for /f "delims=" %%d in ('powershell -noprofile -command "Add-Type -AssemblyName System.Windows.Forms; $f=New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description='Lames histologiques'; $f.RootFolder='MyComputer'; if($f.ShowDialog() -eq 'OK'){$f.SelectedPath}else{exit 1}"') do set "SLIDE_DIR=%%d"
    if "!SLIDE_DIR!"=="" ( echo  Annulé. & pause & exit /b 0 )
    goto :start
)
if "%CHOIX%"=="3" (
    set /p "SLIDE_DIR=  Chemin : "
    goto :start
)
set "SLIDE_DIR=%CD%"

:start
if not exist "!SLIDE_DIR!" ( echo  ✗ Dossier introuvable. & pause & exit /b 1 )

:: Compter les lames
set "COUNT=0"
for %%e in (svs ndpi mrxs tif tiff scn bif dcm jpg jpeg png) do (
    for /f %%c in ('dir /b "!SLIDE_DIR!\*.%%e" 2^>nul ^| find /c /v ""') do set /a COUNT+=%%c
)
echo.
echo  Dossier : !SLIDE_DIR!
echo  Lames   : !COUNT! fichier(s)
echo.

:: ── Trouver un port libre ────────────────────────────────────────────────
set "PORT=8080"
netstat -an | find ":8080 " | find "LISTENING" >nul 2>&1 && set "PORT=8181"

:: ── Lancer le serveur ────────────────────────────────────────────────────
echo  Démarrage sur le port !PORT!...
start "HistoViewer-Server" /b "%VENV_PY%" "%~dp0server.py" "!SLIDE_DIR!" !PORT!

:: Attendre que le serveur réponde
set "TRIES=0"
:wait
timeout /t 1 /nobreak >nul
"%VENV_PY%" -c "import urllib.request; urllib.request.urlopen('http://localhost:!PORT!/api/slides', timeout=1)" >nul 2>&1
if !errorlevel! neq 0 (
    set /a TRIES+=1
    if !TRIES! lss 15 goto :wait
    echo  ✗ Le serveur ne répond pas. Vérifiez les logs.
    pause & exit /b 1
)

:: ── Ouvrir le navigateur ─────────────────────────────────────────────────
start "" "http://localhost:!PORT!/"

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║  Ouvert → http://localhost:!PORT!/                ║
echo  ║                                                  ║
echo  ║  Appuyez sur une touche pour arrêter.            ║
echo  ╚══════════════════════════════════════════════════╝
pause >nul

:: ── Arrêt propre ─────────────────────────────────────────────────────────
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":!PORT! " ^| findstr "LISTENING"') do (
    taskkill /pid %%p /f >nul 2>&1
)
echo  Serveur arrêté.
timeout /t 1 /nobreak >nul
