# Château de Dracula — dialogues à générer

Chaque réplique **parlée** a un fichier audio attendu : `voix/<personnage>/<empreinte>.mp3`, à placer à côté de `index.html`.
L'empreinte est calculée à partir du texte **exact** (ponctuation, apostrophes droites, espaces, « … » compris) : si vous modifiez une phrase, le fichier doit être regénéré (le nom change). Sans fichier, le jeu retombe sur la synthèse vocale du navigateur.

- 53 répliques parlées (Vlad : 16 · Jonathan Harker : 27 · Alex Morel : 8 · Les trois dames : 2)
- Les SMS de Harker ne sont **pas** parlés (texte affiché sur le téléphone) : ils sont listés en italique, sans fichier.
- Si le réseau du téléphone est faible, le texte d'un appel de Harker est brouillé : cette version brouillée n'a pas de fichier et passe par la synthèse vocale (voulu).

## Indications de voix

- **Vlad (le Comte)** : grave, posé, courtois, accent d'Europe de l'Est léger, aristocrate du XIXe siècle ; jamais de colère, une politesse qui glace. Lent.
- **Jonathan Harker** : anglais cultivé de 1890, tendu, essoufflé, parfois chuchoté ; à travers une ligne de téléphone (légère compression, un peu de grésillement possible). Plus haché dans les phrases urgentes (« Il revient ! »).
- **Alex Morel** : voix intérieure, proche du micro, presque murmurée, naturelle, un homme ou une femme d'une trentaine d'années (au choix).
- **Les trois dames** : murmures féminins superposés, doux et affamés, volume bas dans le jeu (0,55). Idéalement trois prises mixées.

## Système — batterie et réseau du téléphone

- **Alex Morel** — « Il me reste la moitié de la batterie. »
  `voix/alex/7f19257b.mp3`
- *SMS système — « Batterie faible : 20 %. Économisez la lampe. »*
- **Alex Morel** — « Je dois économiser la lampe. »
  `voix/alex/5001f2a5.mp3`
- *SMS de Harker — « Éteignez la lampe quand vous n'en avez pas besoin ! »*
- **Alex Morel** — « Plus aucun réseau ici. »
  `voix/alex/5d414cd1.mp3`
- **Alex Morel** — « Il redémarre… 5 %. »
  `voix/alex/26548a83.mp3`

## Prologue — l'appel du Comte

- **Vlad** — « Allô ? Monsieur Morel ? Vlad à l'appareil. Vous m'avez écrit au sujet d'un reportage sur ma demeure. »
  `voix/vlad/a420af7e.mp3`
- **Vlad** — « J'ai lu vos articles. Je préfère parler de vive voix, et chez moi. La route est mauvaise, la nuit : venez ce soir. »
  `voix/vlad/8f5f151f.mp3`
- **Vlad** — « La porte sera ouverte. Le dîner sera prêt. À tout à l'heure. »
  `voix/vlad/8a816586.mp3`

## Chapitre 1 — le hall et le couloir

- **Alex Morel** — « Il y a quelqu'un ? »
  `voix/alex/e9c257ba.mp3`
- **Alex Morel** — « La porte… elle était ouverte à l'instant. »
  `voix/alex/56285e0b.mp3`
- **Jonathan Harker** — « Allô ? Vous m'entendez ? Ne raccrochez pas, et gardez votre lampe allumée. »
  `voix/harker/0b953a41.mp3`
- **Jonathan Harker** — « Je m'appelle Jonathan Harker. Oui, celui du journal. Je ne sais pas pourquoi ce téléphone fonctionne, mais je n'ai pas beaucoup de temps. »
  `voix/harker/e98d2f93.mp3`
- **Jonathan Harker** — « Vous êtes dans le hall. La porte ne s'ouvrira plus avant l'aube : je l'ai assez essayée. »
  `voix/harker/4670cc15.mp3`
- **Jonathan Harker** — « Il vous attend à table. Ne mangez rien. Éclairez le couloir, au fond : c'est le seul chemin ouvert. »
  `voix/harker/b5a6eeb9.mp3`
- **Jonathan Harker** — « Fermée à clef. Je l'ai essayée mille fois. »
  `voix/harker/7045aab6.mp3`
- **Jonathan Harker** — « Cette porte donne sur la cour. Tout y est clos. Pas par là. »
  `voix/harker/b7287bd7.mp3`
- **Jonathan Harker** — « Des meubles mangés par les mites. Rien pour vous. »
  `voix/harker/e24ad1f3.mp3`
- **Jonathan Harker** — « Bien. Suivez le couloir, puis l'escalier. Ne vous retournez pas. »
  `voix/harker/223ead1b.mp3`
- **Jonathan Harker** — « La porte lourde, à gauche, au bout. Entrez : il a mis le couvert pour vous. »
  `voix/harker/edd3b955.mp3`

## Chapitre 2 — la salle du souper

- *SMS de Harker — « Il est près du feu. Ne regardez pas ses yeux. Ne mangez rien, ne buvez rien. »*
- **Vlad** — « Soyez le bienvenu dans ma maison. Entrez librement, et de votre plein gré. »
  `voix/vlad/c66227d5.mp3`
- **Vlad** — « Monsieur Morel. Vos articles sont fort bien écrits. »
  `voix/vlad/c7c3a60c.mp3`
- **Vlad** — « Asseyez-vous, je vous prie. Servez-vous : je ne dîne jamais en compagnie. J'ai déjà dîné. »
  `voix/vlad/e96d7b35.mp3`
- *SMS de Harker — « Il vous observe. Ne touchez à rien. »*
- *SMS de Harker — « Passez en mode caméra (touche V, ou le bouton Caméra du téléphone) et regardez-le. Puis prenez une photo (Action). »*
- *SMS de Harker — « Vous voyez ? Aucune chaleur. Il n'en a jamais eu. »*
- **Vlad** — « Quelque chose vous intrigue, monsieur Morel ? »
  `voix/vlad/dc04d449.mp3`
- *SMS de Harker — « Ne le regardez pas dans les yeux ! »*
- **Alex Morel** — « J'ai la tête qui tourne… »
  `voix/alex/117291b6.mp3`
- **Vlad** — « Vous faites honneur à ma table. »
  `voix/vlad/41ff1711.mp3`
- *SMS de Harker — « Imbécile… c'est fait. Ne recommencez pas. »*
- **Vlad** — « Un tokay de la cave de mes ancêtres. Il vous réchauffera. »
  `voix/vlad/b731a72b.mp3`
- *SMS de Harker — « Je vous avais prévenu. »*
- **Vlad** — « Vous refusez mon hospitalité ? Soit. »
  `voix/vlad/597dccf6.mp3`
- **Vlad** — « La bibliothèque est à votre disposition : vous y trouverez de quoi occuper la nuit. »
  `voix/vlad/a2cb9cec.mp3`
- **Vlad** — « Ne vous égarez pas ailleurs. Bien des portes sont fermées, dans ce château. Je vous laisse. »
  `voix/vlad/2899a00f.mp3`

## Chapitre 3 — la bibliothèque

- **Alex Morel** — « J'ai une batterie externe dans mon sac. Une seule recharge : touche B, ou le bouton du téléphone. »
  `voix/alex/f1f8e3de.mp3`
- **Jonathan Harker** — « Vous êtes dans la bibliothèque. C'est ici que j'ai passé mes premières nuits. »
  `voix/harker/4e4f384f.mp3`
- **Jonathan Harker** — « Il ne reviendra pas tout de suite. J'ai laissé des pages de mon journal dans les pièces : elles disent ce qu'il prépare. »
  `voix/harker/3c3a51bf.mp3`
- **Jonathan Harker** — « Activez le détecteur de votre téléphone, touche K. Il réagit à ce que j'ai touché : plus le signal accélère, plus vous êtes près. »
  `voix/harker/c9e4eefc.mp3`
- **Jonathan Harker** — « Les lumières… Il revient ! Éclairez la porte, vite ! »
  `voix/harker/1ecdfb7a.mp3`
- **Jonathan Harker** — « Respirez. Il joue avec vous. Il reviendra. »
  `voix/harker/c41b632c.mp3`
- **Jonathan Harker** — « C'est tout ce que j'avais laissé. Retournez dans le couloir, jusqu'au puits de l'escalier, tout au fond. Les anciens appartements : elles y sont. »
  `voix/harker/91b7e744.mp3`

## Chapitre 4 — la suite oubliée

- **Jonathan Harker** — « Vous y êtes. Les anciennes chambres des dames. Asseyez-vous sur le canapé : elles viendront par trois côtés, et elles s'approchent à chaque fois que vous détournez les yeux. »
  `voix/harker/86ec4581.mp3`
- **Jonathan Harker** — « Éclairez-les avant qu'elles n'arrivent. Vos paupières vont s'alourdir : appuyez sur Action pour les rouvrir. Ne vous endormez pas. »
  `voix/harker/ea324d46.mp3`
- **Les trois dames** — « Il est à nous… il est à nous… »
  `voix/dames/b567893d.mp3`
- **Vlad** — « Cet homme m'appartient. Reculez. »
  `voix/vlad/938d9ef9.mp3`
- *SMS de Harker — « Elles n'ont pas pu vous toucher. Ne bougez pas. »*
- *SMS de Harker — « Elles vous ont frôlé. Ne bougez pas, ne dites rien. »*
- **Vlad** — « Monsieur Morel, vous êtes épuisé. Dormez, cette nuit. Demain, nous parlerons de votre reportage. »
  `voix/vlad/3dfed08b.mp3`
- **Jonathan Harker** — « Il ne vous a pas sauvé. Il vous garde. Vlad, Vlad Țepeș… vous avez compris qui c'est. »
  `voix/harker/e6ebe228.mp3`
- **Jonathan Harker** — « Descendez : la chambre du Comte, puis la chapelle. C'est là qu'il dort. »
  `voix/harker/95226055.mp3`

## Chapitre 5 — la fenêtre, la chambre du Comte, la chapelle

- **Jonathan Harker** — « Écoutez-moi. Pour descendre jusqu'à lui, il n'y a qu'un chemin : la fenêtre de ma chambre, le long du mur, jusqu'à sa chambre. Je l'ai fait. »
  `voix/harker/5054f10d.mp3`
- **Jonathan Harker** — « Avant, prenez mon crucifix, sur la table de la chambre. Une vieille femme me l'avait donné à Bistritz. »
  `voix/harker/38ccf8ee.mp3`
- **Jonathan Harker** — « Maintenant la fenêtre. Ne regardez pas en bas. Descendez le long du mur, tout droit. »
  `voix/harker/2f54ac2a.mp3`
- **Jonathan Harker** — « Sa chambre. Pas de clef sur lui, je l'ai cherchée. Ce tas d'or n'est qu'un piège : ne touchez à rien. »
  `voix/harker/75edd3ea.mp3`
- **Jonathan Harker** — « La porte, dans le coin, mène à l'escalier. Il dort en bas, dans la chapelle. »
  `voix/harker/c3366207.mp3`
- **Jonathan Harker** — « Vous n'auriez pas dû. »
  `voix/harker/d55e6228.mp3`
- *SMS de Harker — « Il dort. Parlez bas. Le crucifix, sur lui, vite. »*
- **Les trois dames** — « …non… non… »
  `voix/dames/b327114d.mp3`
- **Jonathan Harker** — « Alex… ça tient. Il ne se relèvera pas avant longtemps. Je ne sens plus le château. Je ne sens plus rien du tout. »
  `voix/harker/66e29ca7.mp3`
- **Jonathan Harker** — « Écrivez notre histoire. Vous l'avez vécue. »
  `voix/harker/7fd17ebe.mp3`
- **Vlad** — « Je vous attendais, monsieur Morel. »
  `voix/vlad/0efdcfa9.mp3`
- **Vlad** — « Votre reportage sera magnifique. Vous l'écrirez ici, pour moi. »
  `voix/vlad/fd4ffacf.mp3`
- *SMS de Harker — « Pardon. Je n'ai pas pu vous prévenir à temps. »*

