# Refonte UI/UX — Café Noir Système (référence design)

> **Portée de ce document.** Ceci est une refonte **visuelle et ergonomique**
> uniquement. Elle ne doit modifier **aucune** fonctionnalité, logique métier,
> module, règle de permission ou flux de travail déjà défini dans
> `docs/cahier-des-charges.md` et dans `docs/modules/`. Tout ce qui a déjà été
> spécifié fonctionnellement reste valable tel quel — seule sa présentation change.
> La seule exception est l'ajout d'un nouveau module, **Gestion des tables**
> (voir `docs/modules/12-gestion-des-tables.md`), qui est une extension demandée
> en complément du cahier des charges initial et non une fonctionnalité qui y
> figurait — à traiter comme un avenant fonctionnel, mais qui suit dès sa
> conception le nouveau langage visuel décrit ici.

Ce document est la référence design pour tout le système. Toute reconstruction ou
retouche d'écran doit s'y conformer.

---

## 1. Vision générale

Café Noir Système ne doit pas ressembler à un logiciel de gestion de restaurant
traditionnel. Il doit se sentir comme un **système de contrôle opérationnel
moderne**, pensé pour la façon dont un café fonctionne réellement au quotidien.

Trois principes fondamentaux gouvernent toutes les décisions de design :

1. **Navigation Rapide** — accéder à tout le système depuis n'importe où, via une
   expérience d'accès rapide animée et élégante.
2. **Accès Direct** — aller directement à un module ou à une fonctionnalité
   précise sans traverser des menus et sous-menus inutiles.
3. **Moins de clics** — chaque opération importante doit demander le minimum
   d'interactions possible.

Chaque écran doit répondre à la question : *"De quoi l'utilisateur a-t-il besoin
ici, et comment lui permettre de le faire avec le moins d'interactions
possible ?"*

## 2. Langage visuel général

- Interface **light-mode** premium, propre, épurée.
- Priorités dans cet ordre : **clarté visuelle → hiérarchie → rapidité → usage
  tactile → minimum de clics.**
- **Aucun emoji nulle part** dans l'interface. Utiliser uniquement des icônes
  professionnelles d'interface (type icônes vectorielles de bibliothèque
  d'interface, cohérentes en style et en épaisseur de trait).
- Les photos de produits, visuels de tables, illustrations contextuelles et cartes
  visuelles sont bienvenues **quand elles communiquent l'information plus vite
  qu'un texte** — pas comme décoration gratuite.
- À éviter systématiquement : éléments décoratifs superflus, tableaux trop denses,
  texte excessif, menus compliqués, étapes de confirmation redondantes, contrôles
  minuscules, jargon technique dans l'interface.
- Les statuts (libre/occupée/réservée/en attente/fermée, payée/non payée, stock
  faible/rupture, etc.) doivent être communiqués visuellement par des couleurs
  discrètes, des indicateurs et de la typographie — jamais par la couleur seule
  (toujours un libellé texte associé, pour l'accessibilité et la clarté).

## 3. Navigation Rapide — remplace la barre latérale permanente

**Pas de barre de navigation latérale permanente.** À la place :

- Un petit déclencheur élégant, intégré discrètement à l'interface (visible en
  permanence, mais minimal quand fermé — par exemple dans l'en-tête ou en position
  flottante), qui ouvre l'expérience de navigation rapide.
- À l'activation, une **navigation animée** s'ouvre et présente les modules de
  l'application et leurs fonctionnalités directes, avec des transitions fluides et
  premium, inspirées des interfaces SaaS haut de gamme modernes.
- Les modules peuvent apparaître progressivement, s'étendre naturellement, et
  révéler leurs actions associées via une mise en page interactive élégante.
- **Exemple concret** : sélectionner "Produits" doit immédiatement exposer ses
  actions importantes : Produits, Catégories, Ingrédients, Fiches techniques,
  Importer Excel/CSV, Nouveau produit — chaque destination directement accessible,
  sans écran intermédiaire inutile.
- La navigation reste **minimale une fois fermée**, mais devient un **lanceur
  puissant une fois ouverte**.
- Ce mécanisme remplace uniquement la présentation de la navigation — tous les
  modules et fonctionnalités déjà définis dans le cahier des charges restent
  accessibles, seulement via ce nouveau système d'accès rapide plutôt que par une
  arborescence de menus classique.

## 4. Tablet-first, responsive partout

**La tablette est la référence de conception principale**, car le système est
destiné à un usage naturel dans l'environnement d'un café, où l'interaction
tactile et la reconnaissance visuelle rapide sont essentielles.

L'interface doit ensuite s'adapter intelligemment à :

- **Tablette** — expérience principale de référence.
- **Ordinateur** — espace de travail élargi (peut exploiter l'espace supplémentaire
  pour afficher plus d'informations en parallèle, pas seulement agrandir les
  mêmes éléments).
- **Mobile** — expérience opérationnelle compacte (priorité aux actions les plus
  fréquentes, écran par écran).

Le responsive ne doit **jamais** être un simple rétrécissement de l'interface
desktop. Composants, espacements, navigation, tableaux, formulaires, cartes,
panneaux et interactions doivent se réorganiser intelligemment selon la taille
d'écran.

### Exigences tactiles
- Grandes cibles tactiles.
- Espacement confortable entre les éléments interactifs.
- Gestes de balayage (swipe) là où c'est pertinent (ex: changer d'espace/étage,
  parcourir une liste de statuts).
- Support du glisser-déposer (drag & drop), en particulier pour le plan de salle.
- Retour visuel clair à chaque interaction (pression, glissement, validation).
- Aucun contrôle minuscule demandant de la précision.
- Transitions rapides entre états opérationnels (ex: passer d'une table à une
  autre, changer un statut).

## 5. Formulaires et flux — cohérence avec l'existant

Le patron déjà défini dans `docs/ux-guidelines.md`
(`Formulaire → Aperçu/Récapitulatif → Confirmer`) reste la référence
fonctionnelle. La refonte visuelle doit rendre ce patron **plus rapide à
parcourir visuellement** (moins de texte, plus de repères visuels, actions
groupées logiquement) sans supprimer l'étape de vérification humaine avant
enregistrement, qui reste obligatoire partout, y compris pour le module OCR.

## 6. Application du langage visuel aux modules existants

Tous les modules déjà spécifiés (`docs/modules/01` à `11`) conservent
strictement leurs règles fonctionnelles, leurs champs, leurs statuts et leurs
règles CRUD. Seule leur présentation doit être reconstruite selon ce document :
navigation rapide au lieu d'une barre latérale, cartes et panneaux visuels plutôt
que des tableaux administratifs denses quand c'est pertinent, indicateurs de
statut visuels cohérents, et respect strict du tactile/tablette en priorité.
