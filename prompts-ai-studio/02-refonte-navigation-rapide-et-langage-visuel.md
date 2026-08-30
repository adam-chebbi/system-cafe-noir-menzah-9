# Prompt 2 — Système de design et coquille "Navigation Rapide"

Copie ce texte tel quel dans Google AI Studio une fois le prompt 1 terminé et
validé.

---

Avant de construire le premier module fonctionnel, mets en place la fondation
visuelle de toute l'application, en te basant entièrement sur
`docs/ui-ux-redesign.md`. Cette étape crée la "coquille" de l'application (mise en
page générale, système de design, navigation) que tous les modules suivants
viendront remplir.

Mets en place :

- Un **système de design** cohérent : palette de couleurs en light-mode premium,
  typographie claire et lisible à distance sur tablette, jeu d'icônes
  professionnel unique pour toute l'application (aucun emoji nulle part),
  espacement et rayons de bordure cohérents, composants de base réutilisables
  (boutons, champs de formulaire, cartes, panneaux latéraux, badges de statut).
- Un jeu d'indicateurs de statut visuels réutilisables (couleur + libellé texte,
  jamais couleur seule) destiné à être utilisé par tous les modules pour leurs
  propres statuts (ventes, factures, tables, alertes...).
- La **coquille applicative principale** : pas de barre de navigation latérale
  permanente. Mets en place un petit déclencheur élégant, accessible depuis
  n'importe quel écran, qui ouvre une **Navigation Rapide** animée : une
  expérience de recherche/lancement rapide qui présente les modules de
  l'application et, pour chacun, ses actions/destinations directes les plus
  utilisées (par exemple, pour "Produits" : Produits, Catégories, Ingrédients,
  Fiches techniques, Importer Excel/CSV, Nouveau produit). Les modules peuvent
  apparaître progressivement et s'étendre avec des transitions fluides et
  premium, inspirées des interfaces SaaS modernes haut de gamme. Une fois fermée,
  cette navigation doit rester minimale et discrète.
- Un en-tête persistant minimal contenant, a minima : le déclencheur de navigation
  rapide, une icône d'alertes (cloche), et l'accès au profil administrateur —
  cohérent avec le budget de clics de `docs/ux-guidelines.md`.
- Le patron d'écran standard pour tout formulaire de saisie de l'application
  (`Formulaire → Aperçu/Récapitulatif → Confirmer`), habillé avec ce nouveau
  système de design, prêt à être réutilisé par tous les modules suivants.

Construis cette coquille avec des données ou des libellés de modules
**volontairement fictifs mais représentatifs** à ce stade (les vrais modules
n'existent pas encore) juste pour valider visuellement le comportement de la
Navigation Rapide et du système de design — nous brancherons les vrais modules
dans les prompts suivants.

Termine en me montrant comment déclencher la Navigation Rapide, comment elle se
comporte à l'ouverture et à la fermeture, et confirme qu'aucun élément de
l'interface ne dépend d'une barre latérale permanente pour fonctionner.
