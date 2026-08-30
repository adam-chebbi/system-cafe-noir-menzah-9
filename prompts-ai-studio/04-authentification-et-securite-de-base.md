# Prompt 4 — Authentification de l'administrateur et sécurité de base

Copie ce texte tel quel dans Google AI Studio une fois le prompt 3 terminé et
validé.

---

Mets en place l'authentification de l'application, avec le nouveau système de
design mis en place au prompt 2 (écran de connexion cohérent avec le langage
visuel, sans barre latérale, tablet-first).

Pour rappel, le cahier des charges prévoit un seul compte administrateur avec un
accès complet, sans gestion de rôles ni de comptes multiples
(`docs/cahier-des-charges.md`, section 1) — ne construis pas de système
d'inscription libre, d'invitation d'autres utilisateurs ou de permissions
granulaires.

Mets en place, dès cette étape :

- Un écran de connexion clair en français, avec des messages d'erreur
  compréhensibles par un non-informaticien.
- Un stockage du mot de passe correctement haché avec un algorithme moderne
  adapté aux mots de passe.
- Une gestion de session sécurisée (expiration raisonnable, cookies marqués
  sécurisés et non accessibles en JavaScript, régénération de session à la
  connexion).
- Une protection contre les attaques par force brute sur l'écran de connexion.
- Une protection CSRF sur tous les formulaires qui modifient des données.
- Un mécanisme de réinitialisation de mot de passe simple mais sûr pour un
  utilisateur unique.
- Une séparation stricte entre les routes publiques (site vitrine, menu digital)
  et les routes d'administration, systématiquement protégées, sans exception, y
  compris les routes d'export et de téléchargement de fichiers.
- Le HTTPS comme prérequis documenté pour la production (la configuration
  serveur complète sera traitée plus tard si nécessaire selon l'environnement
  d'hébergement choisi).
- Une journalisation de sécurité minimale (tentatives de connexion échouées,
  changements de mot de passe), distincte du futur journal d'activité fonctionnel
  du cahier des charges (§9.4).

Termine en expliquant comment créer le compte administrateur initial, et confirme
qu'aucune route de l'application (autre que la connexion et les pages publiques du
site/menu) n'est accessible sans authentification.
