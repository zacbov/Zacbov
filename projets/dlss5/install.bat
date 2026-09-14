@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (
  py -3.14 -c "import sys; print(sys.version)" >nul 2>&1 && set "PY=py -3.14"
  if not defined PY py -3.13 -c "import sys; print(sys.version)" >nul 2>&1 && set "PY=py -3.13"
  if not defined PY set "PY=py -3"
) else (
  set "PY=python"
)
if not exist .venv (
  echo Creation de l'environnement Python...
  %PY% -m venv .venv || goto :err
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip || goto :err
python -m pip install numpy pillow "imageio[pyav]" imageio-ffmpeg || goto :err
echo.
echo Installation terminee.
echo Lancez ensuite START.bat
pause
exit /b 0
:err
echo.
echo ERREUR pendant l'installation.
pause
exit /b 1
