# Module 5 — OCR des factures (cahier des charges §6)

**Rappel obligatoire (voir `CLAUDE.md` / `AGENT.md`) : ceci est de l'OCR classique
(reconnaissance de texte), jamais un appel à un modèle de langage (LLM/IA). Le
moteur peut être un OCR local (ex: Tesseract) ou une API OCR "brute" (détection de
texte uniquement, sans interprétation sémantique par IA générative). L'objectif est
d'obtenir du texte brut par zone, pas une "compréhension" de la facture.**

## 5.1 Import (§6)

Formats acceptés : **Photo (prise directe via l'appareil de l'utilisateur), JPG,
PNG, PDF.**

### Flux d'import
`Bouton "Scanner une facture" (accessible en 1 tap, voir ux-guidelines.md) →
Choisir "Prendre une photo" ou "Choisir un fichier" → Aperçu du fichier importé
(l'utilisateur peut reprendre la photo si elle est floue/mal cadrée avant de
lancer l'extraction) → Lancer l'extraction (indicateur de chargement clair,
quelques secondes) → Écran de vérification (5.3)`.

## 5.2 Informations extraites (§6)

Le système tente d'extraire : Fournisseur, Numéro, Date, Produits, Quantités, Prix
unitaires, Montant HT, TVA, Montant TTC.

L'extraction est faite champ par champ à partir du texte détecté (positions,
mots-clés simples comme "Total TTC", "TVA", format de date, etc.) — pas de
génération de contenu, uniquement de la lecture. Si un champ n'est pas détecté
avec confiance suffisante, il doit être **laissé vide plutôt qu'incorrect**, avec
une indication visuelle "non détecté — à saisir".

## 5.3 Écran de vérification humaine (obligatoire avant toute intégration)

C'est l'écran le plus important du module — il doit être conçu avec un soin
particulier car les erreurs de lecture (notamment sur des mentions manuscrites au
stylo, ratures, factures froissées/mal éclairées) seront fréquentes.

### Disposition recommandée
- **Image de la facture visible en permanence** (idéalement redimensionnable/
  zoomable) d'un côté de l'écran (ou en haut, sur mobile), et le **formulaire des
  champs extraits** de l'autre côté (ou en dessous).
- Chaque champ extrait (Fournisseur, Numéro, Date, Montant HT, TVA, Montant TTC,
  et chaque ligne produit/quantité/prix unitaire) est affiché dans un **champ de
  formulaire standard, entièrement modifiable** — jamais en lecture seule tant que
  non validé.
- Si techniquement possible, taper sur un champ met en évidence (zoom/surbrillance)
  la zone correspondante sur l'image source, pour que l'utilisateur retrouve
  facilement où corriger.
- Les lignes produits doivent pouvoir être : corrigées, supprimées (si mal
  détectées en double), ou ajoutées manuellement (si une ligne a été ratée par
  l'OCR).

### Actions disponibles sur cet écran
- **Vérifier** (lecture des valeurs proposées)
- **Modifier** (tout champ, y compris entièrement retaper une valeur mal lue)
- **Valider** — seul bouton qui déclenche l'intégration définitive dans le système
  (création de la `FactureFournisseur`, voir module 4)

Tant que "Valider" n'a pas été cliqué, rien n'est enregistré en base de données
côté factures — seul le fichier importé est conservé (temporairement) pour que
l'utilisateur puisse reprendre la vérification plus tard sans re-scanner.

## 5.4 Correspondance des libellés fournisseur ↔ produits (§6)

Quand un libellé lu sur la facture (ex: "CAFE GRAIN ARABICA 1KG") ne correspond pas
exactement à un article existant dans le catalogue/ingrédients :
- Le système propose les articles existants les plus proches par simple
  correspondance textuelle (recherche approximative sur le nom), **pas de
  similarité sémantique par IA** — une recherche floue classique (distance de
  chaîne de caractères) suffit.
- L'utilisateur choisit l'article correspondant dans une liste déroulante, ou crée
  un nouvel article si besoin.
- Cette correspondance (libellé fournisseur → article interne) est **enregistrée
  et réutilisée automatiquement** pour les prochaines factures du même fournisseur
  portant le même libellé — sans empêcher l'utilisateur de la modifier plus tard si
  elle s'avère incorrecte.

## 5.5 Conservation du fichier

Le fichier original (photo/PDF) est **toujours conservé** dans un espace de
stockage de fichiers durable et reste consultable depuis la fiche
`FactureFournisseur` correspondante après validation — jamais supprimé ni "juste
utilisé puis jeté".

## Entités
- `DocumentImporte` (fichier brut : photo/PDF, date d'import, statut : en attente
  de vérification / validé / abandonné)
- `ExtractionOCR` (résultat brut par champ, avant validation humaine — données
  temporaires liées au `DocumentImporte`)
- `CorrespondanceLibelle` (libellé fournisseur brut, fournisseur, article interne)
- `FactureFournisseur` (voir module 4 — créée seulement après validation)
