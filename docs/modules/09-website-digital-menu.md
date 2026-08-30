# Module 9 — Site internet & Menu digital (cahier des charges §10)

## 9.1 Site internet (§10.1)

### Pages
Accueil, Menu (lien vers le menu digital, §10.2), À propos / Concept, Galerie,
Contact / Localisation.

### Contenu gérable
Adresse, Téléphone, Horaires, Google Maps (intégration d'une carte via adresse/
coordonnées, pas de fonctionnalité de réservation liée), Réseaux sociaux (liens).

### Édition du contenu
Chaque page a un formulaire d'édition simple (texte + photos), avec le même
patron `Modifier → Aperçu → Confirmer/Publier` que le reste de l'application, pour
que la mise à jour du site reste accessible à un non-technicien.

### Explicitement exclu (site V1)
Réservation en ligne, Commande en ligne, Paiement en ligne — aucun formulaire de
réservation, aucun panier, aucune intégration de paiement, même basique/désactivée.

## 9.2 Menu digital (§10.2)

### Connexion au système de gestion
Le menu digital **n'a pas de saisie propre** : il est entièrement dérivé du
catalogue produit (module 2). L'administrateur gère tout depuis l'administration
"Produits" habituelle — pas d'écran de saisie séparé et dupliqué pour le menu.

### Synchronisation des prix
Toute modification de prix validée sur une fiche produit est **automatiquement**
répercutée sur le menu public, sans action supplémentaire de publication requise
pour le prix (le prix affiché = le prix du produit, en temps réel).

### Produit indisponible — 2 options configurables par Café Noir
- **Option 1** : masquer le produit (disparaît totalement du menu public).
- **Option 2** : afficher le produit marqué "indisponible" (visible mais non
  commandable/mis en avant, avec une étiquette claire).
Ce choix peut être réglé par défaut globalement et/ou au cas par cas sur chaque
produit selon ce qui semble le plus utile à l'usage — à confirmer avec le client si
ambigu, sans bloquer le développement (partir sur un réglage par défaut global +
override possible par produit).

### Contenu du menu public
Catégories, Sous-catégories, Recherche (barre de recherche simple sur le nom/
description), Photos, Descriptions, Variantes, Suppléments, Prix.

### Informations strictement internes — jamais publiques
Coûts matière, Marges, Recettes/fiches techniques, toute autre information interne
de gestion. **Vérifier systématiquement qu'aucune route/API publique du menu
digital n'expose ces champs**, même en cas de réutilisation de composants entre
l'admin et le menu public.

### Accès au menu
Depuis le site (page "Menu"), par URL directe (lien public dédié), et via un **QR
Code fourni par Creative Comet** (le QR Code pointe simplement vers l'URL publique
du menu — pas de génération dynamique de QR côté client nécessaire pour la V1, un
lien stable suffit).

### Limitation V1
Le menu est **consultation uniquement** — pas de commande, pas de compte client,
pas d'interaction au-delà de parcourir/rechercher les produits.

## Entités
- `PageSite` (contenu éditable : Accueil, À propos, Galerie, Contact)
- `ParametresSite` (adresse, téléphone, horaires, liens réseaux sociaux, position
  carte)
- Le "Menu digital" ne crée pas de nouvelle entité produit : il réutilise
  `Categorie` / `SousCategorie` / `Produit` / `Variante` / `Supplement` du module 2,
  avec un champ de visibilité publique dérivé de `Disponibilite` + réglage
  masquer/afficher-indisponible.
