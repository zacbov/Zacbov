@echo off
rem Cas cliniques HORS LIGNE : llama-server sert le site ET le modèle d'IA sur ce PC (aucune connexion Internet).
rem Dossiers attendus à côté de ce fichier : llama\ (llama.cpp pour Windows), modeles\ (fichier .gguf), site\ (le site).
chcp 65001 >nul
set ICI=%~dp0
set SITE=%ICI%site
set LLAMA=%ICI%llama\llama-server.exe

rem ---- Choix du modèle (laisser une seule paire de lignes active) -------------------------------------------------
rem Gemma 4 26B-A4B : le modèle de la version en ligne. 17 Go ; 32 Go de mémoire vive conseillés.
rem   --n-cpu-moe 99 : les « experts » restent en mémoire vive, le reste sur la carte graphique (GTX 1080, 8 Go).
set MODELE=%ICI%modeles\gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf
set OPTIONS=-ngl 99 --n-cpu-moe 99 -c 16384
rem Gemma 4 12B : plus petit (6,4 Go), presque entièrement sur la carte graphique ; 16 Go de mémoire vive suffisent.
rem set MODELE=%ICI%modeles\gemma-4-12b-it-IQ4_XS.gguf
rem set OPTIONS=-ngl 99 -c 12288
rem ------------------------------------------------------------------------------------------------------------

if not exist "%LLAMA%" ( echo llama-server.exe introuvable dans %ICI%llama\ & pause & exit /b 1 )
if not exist "%MODELE%" ( echo Modele introuvable : %MODELE% & pause & exit /b 1 )
if not exist "%SITE%\index_hors_ligne.html" ( echo Site introuvable : %SITE%\index_hors_ligne.html & pause & exit /b 1 )

rem le navigateur s'ouvre quand le modèle est chargé (attente de /health)
start "" powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 300;$i++){try{if((Invoke-WebRequest -UseBasicParsing http://localhost:8080/health).StatusCode -eq 200){break}}catch{};Start-Sleep 2}; Start-Process http://localhost:8080/index_hors_ligne.html"

echo Chargement du modele (1 a 2 minutes la premiere fois)...  Fermer cette fenetre arrete l'outil.
rem --host 0.0.0.0 : les autres PC de la salle peuvent ouvrir http://<adresse de ce PC>:8080/index_hors_ligne.html
"%LLAMA%" -m "%MODELE%" %OPTIONS% --path "%SITE%" --host 0.0.0.0 --port 8080 --alias gemma --jinja --reasoning-budget 0 -np 1
pause
