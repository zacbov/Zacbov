@echo off
setlocal
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo L'environnement n'est pas installe.
  echo Lancez d'abord INSTALL.bat
  pause
  exit /b 1
)
call .venv\Scripts\activate.bat
start "DLSS5 WebP Tool" http://127.0.0.1:8765/
python server.py
