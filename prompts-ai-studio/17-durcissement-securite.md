# Prompt 17 — Durcissement de la sécurité de l'application

Copie ce texte tel quel dans Google AI Studio une fois le prompt 16 terminé et
validé.

---

Fais maintenant une revue de sécurité complète et un durcissement de l'ensemble de
l'application construite jusqu'ici, y compris le module Gestion des tables. Passe
en revue chaque module et corrige tout point manquant ou insuffisant parmi les
suivants :

- **Contrôle d'accès** : vérifie que toutes les routes autres que la page de
  connexion et les pages publiques du site/menu digital exigent une authentification
  valide, sans exception, y compris les exports, les téléchargements de fichiers et
  les routes internes du plan de salle (positions de table, informations
  d'espace).
- **Validation des entrées côté serveur** : vérifie que tous les formulaires
  valident réellement les données côté serveur (types, formats, plages de valeurs)
  et pas seulement côté interface, y compris les coordonnées de position de table
  sur le plan (éviter des positions aberrantes envoyées directement à l'API).
- **Uploads de fichiers** : vérifie que chaque point d'upload (photos produits,
  factures, CIN, justificatifs) contrôle le type réel du fichier, limite sa
  taille, et stocke les fichiers de façon à empêcher leur exécution.
- **Injections** : vérifie l'absence de vulnérabilité d'injection (base de
  données, contenu HTML/JavaScript non échappé affiché depuis des données
  utilisateur comme notes de table, commentaires, descriptions de produits).
- **CSRF et sessions** : vérifie que la protection CSRF couvre bien tous les
  formulaires de tous les modules, y compris les actions de glisser-déposer et de
  changement de statut de table.
- **Fuite de données sensibles** : vérifie qu'aucune information sensible (mots de
  passe, données personnelles des employés, coûts matière et marges, informations
  internes du plan de salle) n'apparaît dans les journaux d'application, les
  messages d'erreur, ou une réponse d'API destinée au menu public.
- **En-têtes de sécurité HTTP** : mets en place les en-têtes de sécurité standards
  recommandés pour une application web moderne.
- **Gestion des secrets** : vérifie qu'aucun secret n'est présent en clair dans le
  code source ou dans l'historique Git, et que tout passe par des variables
  d'environnement.
- **Dépendances** : vérifie l'absence de dépendance connue pour des
  vulnérabilités critiques.
- **Journal d'activité et données transactionnelles** : revérifie qu'aucune route
  ne permet de modifier ou supprimer le journal d'activité, et qu'aucune entité
  transactionnelle ne peut être supprimée définitivement par un chemin détourné.
- **Absence d'intelligence artificielle** : relis l'ensemble du code du module OCR,
  du module Gestion des tables, et de toute autre partie du projet pour confirmer
  qu'aucun appel à un service de LLM ou d'IA générative n'a été introduit, y
  compris indirectement via une dépendance tierce.

Pour chaque point, indique-moi clairement ce qui était déjà correct, ce qui a été
corrigé, et si un point nécessite une décision de ma part.
