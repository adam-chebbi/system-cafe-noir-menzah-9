# Prompt 7 — Module Gestion des stocks

Copie ce texte tel quel dans Google AI Studio une fois le prompt 6 terminé et
validé.

---

Construis le module Gestion des stocks tel que décrit dans
`docs/modules/03-stock.md` (cahier des charges §4), intégré à la Navigation Rapide
et au système de design déjà en place.

Points fonctionnels essentiels :

- Deux zones fixes uniquement : Réserve principale et Dépôt.
- Mouvements de stock (date/heure, produit, quantité, zone, origine, destination,
  motif, commentaire) couvrant entrées, sorties et transferts ; un transfert entre
  les deux zones se saisit en une seule opération liée automatiquement.
- Le stock négatif est autorisé et ne bloque jamais une opération : il déclenche
  seulement une alerte.
- Inventaires (complet, par catégorie, par zone) affichant stock théorique, saisie
  du stock réel, écart et valeur d'écart calculés en direct, avec le choix à la
  validation entre ajuster au stock réel ou conserver le stock théorique — l'écart
  reste toujours enregistré.
- Pertes et ajustements couvrant tous les motifs prévus, alimentant un rapport des
  pertes en quantité et en valeur.
- Lots et péremptions facultatifs par article, délai d'alerte paramétrable, seuil
  minimum et stock cible par produit.
- Valorisation exclusivement au coût moyen pondéré.

Respecte le budget de clics défini dans `docs/ux-guidelines.md` pour l'ajout d'un
mouvement de stock et le lancement d'un inventaire, et présente les niveaux de
stock avec des indicateurs visuels clairs (couleur + libellé) plutôt qu'un tableau
brut de chiffres.

Peuple ce module avec des **mouvements et niveaux de stock réalistes**, cohérents
avec le catalogue déjà créé au prompt précédent : quantités d'ingrédients
plausibles réparties entre les deux zones, un historique de mouvements sur
plusieurs jours incluant au moins un transfert, au moins une perte avec motif, et
au moins un inventaire complété avec un écart constaté.

Confirme que toutes les routes de modification de stock sont réservées à
l'administrateur authentifié et que toute quantité saisie est validée côté
serveur.
