DLSS 5 WebP Tool
================

Ce petit outil fournit une interface HTML locale pour appliquer le moteur DLSS 5
Neural Rendering du package DLSS5-AE 1.1.0 à un WebP animé, image par image.

INSTALLATION
------------
1. Décompressez ce dossier sur un PC Windows avec un GPU NVIDIA compatible D3D12.
2. Double-cliquez sur INSTALL.bat.
3. Quand l'installation est terminée, double-cliquez sur START.bat.
4. Le navigateur ouvre http://127.0.0.1:8765/.
5. Déposez un .webp animé et cliquez sur APPLIQUER DLSS 5.

IMPORTANT
---------
- Le calcul est local. Le fichier n'est pas envoyé sur Internet.
- Le moteur utilisé est nvngx.dll_dlss5ae.dll et appelle les runtimes NVIDIA fournis
dans le dossier runtime.
- Le moteur fourni limite les images à 7680x4320 (selon son ABI).
- L'outil conserve le nombre d'images, les durées et la boucle du WebP source.
- Le résultat est réencodé en WebP animé.
- Le navigateur n'exécute pas le DLL directement : server.py fait le pont Python/ctypes.

DEPANNAGE
---------
Si Windows affiche une erreur DLL, laissez les quatre DLL du dossier runtime ensemble.
Si le GPU n'est pas compatible ou si le driver NVIDIA est trop ancien, le moteur peut
refuser l'initialisation. Le message d'erreur apparaît dans l'interface.

Les DLL NVIDIA proviennent du package DLSS5-AE 1.1.0 fourni pour cette conversation.
Consultez les fichiers de licence/THIRD_PARTY du package source pour les conditions
d'utilisation et de redistribution.
