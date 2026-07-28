@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title HistoViewer — Installation
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║         HistoViewer — Installation               ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: ── Trouver un Python valide (hors WAPT / hors logiciels tiers) ──────────
echo  [1/5] Recherche de Python...

set "PYTHON_EXE="

:: Essayer py launcher (Python officiel Windows — priorité maximale)
py -3 --version >nul 2>&1
if !errorlevel!==0 (
    for /f "tokens=*" %%v in ('py -3 --version 2^>^&1') do echo      %%v  (py launcher^)
    set "PYTHON_EXE=py -3"
    goto :found_python
)

:: Essayer les emplacements standards AppData\Local
for %%p in (
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python39\python.exe"
    "C:\Python313\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
) do (
    if exist %%p (
        for /f "tokens=*" %%v in ('%%p --version 2^>^&1') do echo      %%v  (%%p^)
        set "PYTHON_EXE=%%p"
        goto :found_python
    )
)

:: Chercher python dans le PATH en excluant WAPT et autres outils
for /f "tokens=*" %%p in ('where python 2^>nul') do (
    echo %%p | findstr /i "wapt\|chocolatey\|scoop\|conda" >nul
    if !errorlevel! neq 0 (
        for /f "tokens=*" %%v in ('"%%p" --version 2^>^&1') do echo      %%v  (%%p^)
        set "PYTHON_EXE=%%p"
        goto :found_python
    )
)

echo  ✗ Aucun Python valide trouvé (le Python WAPT est incompatible).
echo.
echo  → Installez Python depuis : https://www.python.org/downloads/
echo    Cochez IMPERATIVEMENT "Add Python to PATH"
echo.
pause
start https://www.python.org/downloads/
exit /b 1

:found_python
echo.
echo  [2/5] Création de l'environnement virtuel isolé (.venv)...
echo        (évite tout conflit avec WAPT ou d'autres Pythons)

if exist "%~dp0.venv\Scripts\python.exe" (
    echo      Déjà existant — OK
) else (
    %PYTHON_EXE% -m venv "%~dp0.venv"
    if !errorlevel! neq 0 (
        echo  ✗ Impossible de créer le venv.
        pause & exit /b 1
    )
    echo      Créé dans .venv\
)

set "VENV_PY=%~dp0.venv\Scripts\python.exe"

:: ── pip à jour dans le venv ───────────────────────────────────────────────
echo.
echo  [3/5] Mise à jour de pip dans le venv...
"%VENV_PY%" -m pip install --upgrade pip --quiet

:: ── Installer dans le venv ────────────────────────────────────────────────
echo.
echo  [4/5] Installation Flask + Pillow + OpenSlide dans le venv...
echo        (OpenSlide v4+ inclut les DLL Windows automatiquement)
echo.

"%VENV_PY%" -m pip install "flask>=3.0" "Pillow>=10.0" "openslide-python>=4.0" --quiet
if !errorlevel! neq 0 (
    echo  ⚠ openslide-python indisponible, installation sans...
    "%VENV_PY%" -m pip install "flask>=3.0" "Pillow>=10.0" --quiet
)

:: ── Vérification ──────────────────────────────────────────────────────────
echo.
echo  [5/5] Vérification...
"%VENV_PY%" -c "import flask; print('     Flask', flask.__version__)" 2>nul || echo  ✗ Flask manquant
"%VENV_PY%" -c "from PIL import Image; print('     Pillow OK')" 2>nul || echo  ✗ Pillow manquant
"%VENV_PY%" -c "import openslide; print('     OpenSlide OK')" 2>nul || echo  ⚠ OpenSlide absent (JPEG/PNG/TIFF simples seulement)

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║        Installation terminée !                   ║
echo  ║                                                  ║
echo  ║  Double-cliquez maintenant sur launch.bat        ║
echo  ╚══════════════════════════════════════════════════╝
echo.
pause
