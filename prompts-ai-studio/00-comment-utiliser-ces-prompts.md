# Prompts pour Google AI Studio — Café Noir Système (build complet + nouveau design + Gestion des tables)

Ce dossier contient la **suite complète et ordonnée de prompts en texte brut**
(aucun extrait de code) à copier-coller un par un dans Google AI Studio, une fois
le dépôt Git importé (voir `docs/git-ai-studio-workflow.md`), pour construire
l'application **du tout début jusqu'à un état recette-prêt**, avec le nouveau
langage visuel (Navigation Rapide, tablet-first) appliqué dès la construction de
chaque écran, et le nouveau module Gestion des tables inclus.

## Comment les utiliser

1. Assurez-vous que le dépôt importé dans AI Studio contient `AGENT.md` et tout le
   dossier `docs/` (cahier des charges, refonte UI/UX, modules 1 à 12, matrice
   CRUD, guide UX) — chaque prompt suppose que ces documents sont déjà lisibles par
   l'outil.
2. Copiez le contenu de `01-...md`, collez-le dans la conversation de
   développement d'AI Studio, laissez le travail se faire, vérifiez le résultat.
3. Ne passez au prompt suivant que lorsque le précédent est satisfaisant — chaque
   prompt suppose que les précédents ont été correctement réalisés.
4. Committez et poussez régulièrement vers le dépôt GitHub à chaque étape
   importante (voir `docs/git-ai-studio-workflow.md`).
5. Si AI Studio pose une question sur un point non couvert par la documentation,
   répondez-y vous-même plutôt que de laisser l'outil deviner.

## Ordre des prompts

| # | Fichier | Objectif |
|---|---|---|
| 1 | `01-import-projet-et-cadrage.md` | Lecture de la documentation, choix technique, structure de base |
| 2 | `02-refonte-navigation-rapide-et-langage-visuel.md` | Système de design + coquille applicative avec Navigation Rapide |
| 3 | `03-modele-de-donnees.md` | Modèle de données complet (tous modules, y compris Gestion des tables) |
| 4 | `04-authentification-et-securite-de-base.md` | Compte administrateur unique, sécurité de base |
| 5 | `05-module-tableau-de-bord-et-ventes.md` | Module 1 — §2 |
| 6 | `06-module-produits-recettes-marges.md` | Module 2 — §3 |
| 7 | `07-module-gestion-des-stocks.md` | Module 3 — §4 |
| 8 | `08-module-fournisseurs-achats-factures.md` | Module 4 — §5 |
| 9 | `09-module-ocr-factures.md` | Module 5 — §6 |
| 10 | `10-module-depenses.md` | Module 6 — §7 |
| 11 | `11-module-employes.md` | Module 7 — §8 |
| 12 | `12-module-rapports-alertes-audit.md` | Module 8 — §9 |
| 13 | `13-module-site-internet-menu-digital.md` | Module 9 — §10 |
| 14 | `14-module-gestion-des-tables-plan-visuel.md` | Module 12 — nouveau, plan de salle visuel complet |
| 15 | `15-import-donnees-initiales.md` | Intégration initiale — §11, avec données réelles |
| 16 | `16-responsive-tablette-desktop-mobile.md` | Passe responsive tablet-first sur toute l'application |
| 17 | `17-durcissement-securite.md` | Passe de sécurisation complète |
| 18 | `18-validation-finale-ux-et-recette.md` | Vérification finale : design, fonctionnalité, sécurité, périmètre |

## Rappels valables pour toute la suite

- **Navigation Rapide dès le départ.** Le prompt 2 met en place la coquille
  visuelle et la navigation ; tous les modules construits ensuite (prompts 5 à 14)
  doivent s'y intégrer nativement — ne construis jamais un écran avec une barre
  latérale classique "en attendant" de le refaire plus tard.
- **Tablet-first dès le départ.** Chaque écran construit doit déjà être pensé pour
  la tablette avant d'être adapté au desktop/mobile ; le prompt 16 est une passe de
  vérification et de rattrapage, pas la première fois que le responsive est
  considéré.
- **Aucune fonctionnalité d'intelligence artificielle**, nulle part, y compris dans
  le module Gestion des tables (pas de placement automatique "intelligent") et
  dans l'OCR (moteur de reconnaissance de texte classique uniquement).
- **Zéro emoji**, icônes professionnelles uniquement, interface en français,
  montants en dinars tunisiens, aucune suppression définitive de données
  transactionnelles, journal d'activité toujours en lecture seule.
- **Utiliser des données réelles et plausibles** (vrais produits de café, vrais
  fournisseurs, vrais montants) pour peupler et démontrer chaque module au fil de
  sa construction — jamais de données de test manifestement fictives.
