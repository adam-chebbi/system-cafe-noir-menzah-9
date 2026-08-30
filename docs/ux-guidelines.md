# UX Guidelines — conçu pour un(e) non-informaticien(ne), en un minimum de clics

> **Mise à jour design.** La section "Navigation persistante recommandée"
> ci-dessous décrivait une barre de navigation latérale classique. Elle est
> **remplacée** par le système "Navigation Rapide" décrit dans
> `docs/ui-ux-redesign.md` (section 3) : plus de barre latérale permanente, un
> déclencheur minimal qui ouvre un accès rapide animé aux modules et à leurs
> actions directes. Tout le reste de ce document (budget de clics, principes de
> formulaire, aperçu + validation, etc.) reste pleinement valable et doit
> simplement être habillé avec le nouveau langage visuel.

Ces règles s'appliquent à **tous** les modules. Elles ne sont pas optionnelles :
tout écran livré doit pouvoir être relu contre cette checklist.

## Principes généraux

1. **Une action = un but visible.** Chaque écran a un objectif unique et évident
   (ex: "Enregistrer une vente"), énoncé en haut de l'écran en français simple.
2. **Pas de jargon technique.** Jamais de "CRUD", "payload", "endpoint", "sync",
   "cache" dans l'interface. Utiliser le vocabulaire métier du cahier des charges
   ("vente", "mouvement de stock", "bon de commande", "facture", "écart").
3. **Gros éléments tactiles.** Boutons et champs dimensionnés pour un usage tablette
   au comptoir, pas seulement souris (cible minimum ~44×44px).
4. **Toujours un chemin de retour.** Un bouton "Annuler" ou "Retour" visible sur
   chaque écran de saisie/édition, sans exception.
5. **Confirmation avant tout ce qui est irréversible-apparent** (annulation de
   vente, validation d'un inventaire, envoi d'une réception fournisseur) — même si
   la donnée n'est jamais vraiment supprimée en base, l'utilisateur doit avoir
   l'impression de contrôler une action engageante.
6. **Aperçu avant validation, partout.** Toute création/édition passe par :
   `Formulaire → Aperçu/Récapitulatif → Confirmer`. Le récapitulatif doit
   reprendre exactement ce qui sera enregistré (mêmes libellés, mêmes montants).
7. **Erreurs en langage humain.** Jamais un message d'erreur brut de validation
   technique ; toujours une phrase actionnable ("Le prix doit être supérieur à 0
   TND.", pas "ValidationError: price must be > 0").
8. **Un seul niveau de menu principal.** Pas de sous-menus imbriqués sur plus de 2
   niveaux pour atteindre une fonction courante.
9. **États visuels clairs.** Codes couleur cohérents dans toute l'app pour les
   statuts (ex: rouge = alerte/rupture/impayée, orange = à surveiller/partielle,
   vert = ok/payée) — toujours accompagnés d'un libellé texte, jamais couleur
   seule (accessibilité).
10. **Recherche visible en haut de chaque liste** (produits, fournisseurs,
    employés, factures) — pas besoin de scroller pour filtrer.

## Budget de clics — actions du quotidien

Ces actions sont utilisées plusieurs fois par jour au comptoir : elles doivent être
accessibles en 1 à 2 taps depuis n'importe quel écran, via une navigation
persistante (barre de navigation + bouton d'action rapide flottant "+").

| Action | Depuis n'importe où | Détail |
|---|---|---|
| Enregistrer une vente manuelle | 1 tap | Bouton d'action rapide "+" toujours visible → formulaire de vente |
| Scanner / importer une facture | 1 tap | Icône appareil photo dans la navigation principale |
| Ajouter un mouvement de stock | 2 taps | Nav → Stock → "+" |
| Marquer la présence du jour | 2 taps | Nav → Employés → "Présence du jour" |
| Voir le tableau de bord | 1 tap | Écran d'accueil par défaut à l'ouverture |
| Consulter les alertes actives | 1 tap | Badge/cloche toujours visible dans l'en-tête |
| Ajouter une dépense | 2 taps | Nav → Dépenses → "+" |
| Créer un bon de commande fournisseur | 2 taps | Nav → Fournisseurs → "+ Commande" |
| Lancer un inventaire | 2 taps | Nav → Stock → "Inventaire" |

Actions moins fréquentes (paramétrage des seuils, fiches techniques, gestion du
site/menu digital) peuvent être à 2-3 taps, mais jamais plus.

## Navigation persistante recommandée

Barre de navigation principale (bas sur mobile, latérale sur tablette/desktop) avec
au maximum ces entrées, dans cet ordre de fréquence d'usage :

1. **Tableau de bord** (accueil)
2. **Ventes** (raccourci "+")
3. **Stock** (mouvements, inventaires, pertes)
4. **Produits** (catalogue, recettes, marges)
5. **Fournisseurs & Factures** (commandes, factures, OCR)
6. **Dépenses**
7. **Employés**
8. **Rapports**
9. **Site & Menu digital**

Une icône "cloche" (alertes) et une icône profil/administrateur restent fixes dans
l'en-tête, indépendamment de l'écran affiché.

## Formulaires de saisie manuelle — modèle standard

Chaque module de saisie (vente, mouvement de stock, dépense, facture, employé,
présence...) suit le même patron d'écran pour que l'utilisateur retrouve toujours
ses repères :

1. **Titre clair** de l'action en cours.
2. **Champs groupés logiquement**, libellés en français, valeurs par défaut
   sensées (date = aujourd'hui, zone = dernière utilisée, etc.) pour réduire la
   saisie.
3. **Aperçu / Récapitulatif** avant validation — affichage en lecture seule de ce
   qui sera enregistré, avec un bouton "Modifier" pour revenir en arrière sans
   perdre les données déjà saisies.
4. **Bouton de confirmation** explicite ("Enregistrer la vente", pas "OK"/"Submit").
5. **Confirmation visuelle** après enregistrement (bandeau de succès + retour à
   l'écran d'origine ou à la liste, au choix du parcours le plus utile).

## OCR — règles UX spécifiques (voir aussi `docs/modules/05-ocr-invoices.md`)

- Le flux est : **Prendre une photo / Choisir un fichier → Extraction automatique
  (attente visible) → Écran de vérification avec chaque champ extrait éditable →
  Confirmer**.
- Chaque champ extrait affiche, si possible, un aperçu de la zone de la facture
  d'où il a été lu (zoom sur la zone concernée) pour faciliter la correction
  visuelle par l'utilisateur, notamment pour les mentions manuscrites.
- Aucune donnée extraite n'est enregistrée tant que l'utilisateur n'a pas cliqué
  sur "Valider" — un champ mal lu doit pouvoir être corrigé comme n'importe quel
  champ de formulaire classique, sans redémarrer le scan.
- Le fichier original (photo/PDF) est toujours conservé et reste accessible depuis
  la fiche facture correspondante, même après validation.
