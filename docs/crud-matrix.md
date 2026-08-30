# Matrice CRUD — toutes les entités du système

Une seule sorte d'utilisateur existe (Administrateur, accès complet). "CRUD" est
donc listé par entité et par contrainte métier, pas par rôle. Légende :
**C**réer · **L**ire · **M**odifier (édition) · **A**nnuler/Corriger (jamais de
suppression définitive) · **X** = opération interdite pour cette entité.

| Entité | C | L | M | A/Correction | Suppression définitive | Notes |
|---|---|---|---|---|---|---|
| Vente | ✅ (manuelle, Excel, CSV) | ✅ | ✅ (correction tracée) | ✅ (annulation tracée) | ❌ jamais | Historique conservé, §2.2 |
| Catégorie / Sous-catégorie | ✅ | ✅ | ✅ | ✅ (désactivation, pas suppression si utilisée) | ❌ si utilisée par un produit | §3.1 |
| Produit | ✅ | ✅ | ✅ | ✅ (marquer indisponible) | ⚠️ possible seulement si jamais vendu/utilisé | §3.1, §10.2 |
| Variante / Supplément | ✅ | ✅ | ✅ | ✅ (désactiver) | ⚠️ si jamais utilisé | §3.1 |
| Fiche technique / Recette | ✅ | ✅ | ✅ (recalcule coût matière) | — | ⚠️ si liée à un produit actif, avertir | §3.2 |
| Ingrédient | ✅ | ✅ | ✅ (déclenche recalcul coût) | ✅ (désactiver) | ⚠️ si utilisé dans une recette/stock | §3.2, §4 |
| Zone de stockage | ❌ (figées: Réserve, Dépôt) | ✅ | ❌ | — | ❌ | Pas d'ajout de zone en V1, §4.1 |
| Mouvement de stock | ✅ | ✅ | ✅ (tracé) | ✅ (annulation tracée) | ❌ jamais | §4.2 |
| Inventaire | ✅ | ✅ | — | ✅ (validation = ajuster ou conserver, écart conservé) | ❌ jamais | §4.3 |
| Perte / Ajustement | ✅ | ✅ | ✅ (tracé) | ✅ (annulation tracée) | ❌ jamais | §4.4 |
| Lot (numéro, péremption) | ✅ (à la réception, facultatif) | ✅ | ✅ | — | ❌ | §4.5 |
| Seuil de stock (min/cible) | ✅ | ✅ | ✅ | — | ✅ (retirer le seuil, pas l'historique) | §4.5 |
| Fournisseur | ✅ | ✅ | ✅ | ✅ (désactiver) | ⚠️ si commandes/factures liées | §5.1 |
| Prix d'achat (historique) | ✅ (auto à chaque achat) | ✅ | ❌ (append-only) | — | ❌ jamais | §5.1 |
| Bon de commande | ✅ | ✅ | ✅ (tant que non reçue) | ✅ (annulation) | ❌ jamais | Statuts §5.2 |
| Réception (sur commande) | ✅ (peut être multiple) | ✅ | ⚠️ correction tracée | ✅ (annulation tracée, impacte stock) | ❌ jamais | §5.2 |
| Facture fournisseur | ✅ (manuelle ou via OCR) | ✅ | ✅ (tracée) | ✅ (annulation tracée) | ❌ jamais | §5.3, §6 |
| Paiement de facture | ✅ | ✅ | ✅ (tracé) | ✅ (annulation tracée) | ❌ jamais | Statuts §5.3 |
| Correspondance libellé OCR ↔ produit | ✅ | ✅ | ✅ | ✅ (supprimer la correspondance) | ✅ (n'affecte pas les factures déjà validées) | §6 |
| Dépense | ✅ | ✅ | ✅ (tracée) | ✅ (annulation tracée) | ❌ jamais | §7 |
| Catégorie de dépense | ✅ | ✅ | ✅ | ✅ (désactiver si utilisée) | ⚠️ si utilisée | §7 |
| Employé (fiche) | ✅ | ✅ | ✅ | ✅ (statut actif/inactif) | ❌ jamais (historique paie/présence lié) | §8 |
| Présence / Planning (jour) | ✅ (saisie manuelle) | ✅ | ✅ (tracée) | ✅ (annulation tracée) | ❌ jamais | §8.1 |
| Mouvement financier employé (avance, prime, retenue, paiement) | ✅ | ✅ | ✅ (tracé) | ✅ (annulation tracée) | ❌ jamais | §8.2 |
| Rapport mensuel PDF | ✅ (génération) | ✅ | ❌ | — | ✅ (supprimer le fichier généré, pas les données sources) | §9.2 |
| Alerte | — (générée automatiquement par règles) | ✅ | ❌ | ✅ (marquer traitée/vue) | ❌ jamais (historisée) | §9.3 |
| Journal d'activité (audit log) | ✅ (écriture automatique système uniquement) | ✅ | ❌ jamais, même admin | ❌ | ❌ jamais, même admin | §9.4 — append-only strict |
| Page du site (contenu) | ✅ | ✅ | ✅ | — | ✅ (contenu simple, pas de commandes liées) | §10.1 |
| Menu digital (visibilité produit) | — (dérivé du produit) | ✅ | ✅ (masquer/indisponible) | — | — | §10.2, synchronisé avec Produit |
| Facture/photo importée (fichier brut) | ✅ (upload) | ✅ (toujours consultable) | ❌ (le fichier lui-même n'est pas édité) | — | ❌ jamais tant que la facture existe | §6 — conservation obligatoire |

## Entités du module Gestion des tables (avenant, §12 des modules — voir `docs/modules/12-gestion-des-tables.md`)

| Entité | C | L | M | A/Correction | Suppression définitive | Notes |
|---|---|---|---|---|---|---|
| Espace / Étage | ✅ | ✅ | ✅ | ✅ (archiver) | ⚠️ seulement si vide, sinon archiver | §12.1 |
| Table | ✅ (forme + capacité, puis positionnement) | ✅ | ✅ (nom, capacité, forme, position, espace) | ✅ (désactiver si historique lié) | ⚠️ seulement si aucun historique (réservation/occupation passée) | §12.2, §12.5 |
| Objet de plan (mur, porte, fenêtre, plante...) | ✅ | ✅ | ✅ (position, type) | — | ✅ (purement décoratif/structurel, pas d'historique transactionnel) | §12.4 |

## Règles transverses

- **Aucune suppression physique** de données transactionnelles (ventes, mouvements
  de stock, factures, dépenses, paiements, présences, mouvements financiers
  employés, réceptions). Toujours "annuler" ou "corriger" avec trace.
- **Le journal d'activité est la seule entité totalement en lecture seule** depuis
  l'interface d'administration : aucune route/API d'édition ou de suppression ne
  doit exister pour lui, à aucun niveau.
- **Toute opération de type M (modification) ou A (annulation/correction) doit
  écrire une entrée dans le journal d'activité** avec ancienne valeur / nouvelle
  valeur (§9.4).
- **⚠️** = suppression conditionnelle uniquement si l'entité n'est reliée à aucune
  donnée transactionnelle ; sinon proposer la désactivation à la place et
  l'expliquer à l'utilisateur en langage clair.
