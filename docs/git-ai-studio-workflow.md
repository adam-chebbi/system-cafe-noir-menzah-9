# Workflow — Git + Google AI Studio

Ce document explique, en langage simple, comment passer de cette documentation à
un projet en développement dans Google AI Studio.

## 1. Préparer le dépôt Git

1. Créez un nouveau dossier de projet sur votre ordinateur (ou utilisez un dossier
   vide dédié à Café Noir Système).
2. Placez-y tout le contenu de cette archive : `AGENT.md`, `README.md`, le dossier
   `docs/` complet, et le dossier `prompts-ai-studio/`.
3. Initialisez un dépôt Git dans ce dossier et faites un premier commit contenant
   uniquement cette documentation (pas encore de code applicatif).
4. Créez un nouveau dépôt sur GitHub (public ou privé selon votre préférence — un
   dépôt privé est recommandé puisque ce projet contient des informations internes
   de gestion d'un café réel une fois le développement commencé).
5. Poussez (`push`) votre commit initial vers ce dépôt GitHub.

À ce stade, votre dépôt GitHub contient uniquement la documentation de cadrage —
c'est volontaire : c'est cette documentation qui va guider tout le développement
qui suivra dans AI Studio.

## 2. Importer le projet dans Google AI Studio

1. Ouvrez Google AI Studio et utilisez la fonctionnalité permettant de démarrer ou
   d'importer un projet depuis un dépôt GitHub (connectez votre compte GitHub si ce
   n'est pas déjà fait, puis sélectionnez le dépôt Café Noir Système que vous venez
   de créer).
2. Une fois le projet importé, assurez-vous que l'environnement peut bien lire
   l'ensemble des fichiers du dossier `docs/` et le fichier `AGENT.md` — ce sont
   les documents que vous référencerez dans vos prompts.
3. Ne commencez à écrire du code applicatif qu'à partir du premier prompt du
   dossier `prompts-ai-studio/` (voir `prompts-ai-studio/00-comment-utiliser-ces-prompts.md`).

## 3. Développer via les prompts

- Ouvrez `prompts-ai-studio/00-comment-utiliser-ces-prompts.md` pour l'ordre et la
  logique de la suite de prompts.
- Copiez le contenu de chaque fichier de prompt, dans l'ordre, directement dans la
  conversation de développement d'AI Studio.
- Après chaque prompt, relisez le résultat, testez-le, et ne passez au prompt
  suivant que lorsque vous êtes satisfait — chaque prompt suppose que les
  précédents ont été correctement réalisés.
- À chaque étape importante, committez et poussez les changements de code vers le
  même dépôt GitHub, pour garder un historique clair de l'avancement et pouvoir
  revenir en arrière si besoin.

## 4. Bonnes pratiques pendant le développement

- Ne modifiez jamais directement les fichiers de `docs/` pendant le développement
  courant : ce sont les documents de référence contractuels et de design. Si le
  périmètre doit évoluer, cela doit être discuté et acté explicitement (avenant),
  puis les documents mis à jour en conséquence — pas modifiés silencieusement au
  fil du code.
- Gardez le dépôt GitHub comme unique source de vérité : si AI Studio propose de
  sauvegarder autrement (export local, etc.), préférez toujours repasser par un
  commit/push vers le dépôt pour ne pas perdre d'historique.
- Si AI Studio pose des questions sur un point non couvert par la documentation,
  répondez-y directement plutôt que de laisser l'outil deviner — puis notez la
  décision quelque part (par exemple dans un fichier `docs/decisions.md` que vous
  pouvez créer au fil du projet) pour garder une trace des choix pris en dehors du
  cahier des charges initial.
