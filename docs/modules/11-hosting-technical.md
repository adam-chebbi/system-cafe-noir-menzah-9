# Module 11 — Hébergement & Environnement technique (cahier des charges §12)

## Type de solution
Application web responsive fonctionnant sur les navigateurs modernes. **Pas
d'application mobile native** (rappel §13, hors périmètre).

## Choix de la stack
Laissé à la charge de Creative Comet, sous la seule réserve de respecter toutes les
fonctionnalités du cahier des charges. Sur ce repo : si aucune stack n'existe
encore, la proposer et la faire confirmer par l'utilisateur avant de scaffolder quoi
que ce soit (voir `CLAUDE.md` §3).

## Services attendus pendant la période initiale (Convention de collaboration)
- Hébergement de la plateforme
- Hébergement du site
- Sauvegardes quotidiennes
- Maintenance corrective
- Assistance
- Mises à jour techniques nécessaires

### Implications techniques concrètes
- Prévoir une stratégie de **sauvegarde quotidienne** de la base de données et des
  fichiers uploadés (factures scannées, photos produits, photos CIN, justificatifs
  de dépenses) dès la mise en place de l'infrastructure — ne pas la considérer comme
  un "détail à voir plus tard".
- Le stockage de fichiers doit être durable et non éphémère (pas de dossier
  temporaire local qui pourrait être vidé) — cohérent avec l'exigence de
  conservation systématique des documents importés (§6, module 5).
- Prévoir un mécanisme simple de mise à jour technique (déploiement) qui n'exige
  pas d'interruption de service prolongée, l'établissement étant utilisé en continu
  au quotidien pour les ventes.

## Conditions contractuelles (durée, renouvellement, transfert)
Définies dans la Convention de collaboration — **hors périmètre de ce dépôt de
code**, à ne pas modéliser dans l'application (ce n'est pas une donnée métier de
gestion de café).
