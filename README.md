# Café Noir Système — Gestion V1 + Refonte UI/UX (piste Git → Google AI Studio)

Documentation de cadrage pour le développement, via **Google AI Studio**, de la
solution de gestion de **Café Noir — Menzah 9** (Ste Creative Comet SARL), avec sa
refonte visuelle et son nouveau module Gestion des tables.

## À lire en premier

1. [`AGENT.md`](./AGENT.md) — règles de travail pour tout agent IA (dont AI Studio).
2. [`docs/cahier-des-charges.md`](./docs/cahier-des-charges.md) — le contrat
   fonctionnel original (V1).
3. [`docs/ui-ux-redesign.md`](./docs/ui-ux-redesign.md) — la référence design de la
   refonte (Navigation Rapide, tablet-first, langage visuel).
4. [`docs/git-ai-studio-workflow.md`](./docs/git-ai-studio-workflow.md) — comment
   pousser ce dossier sur Git puis l'importer dans Google AI Studio.
5. [`prompts-ai-studio/00-comment-utiliser-ces-prompts.md`](./prompts-ai-studio/00-comment-utiliser-ces-prompts.md)
   — la suite de prompts à utiliser une fois le projet importé dans AI Studio.

## Structure

```
.
├── AGENT.md                        # Règles pour tout agent IA (dont AI Studio)
├── README.md                       # Ce fichier
├── docs/
│   ├── cahier-des-charges.md       # Cahier des charges signé V1 (référence contractuelle fonctionnelle)
│   ├── ui-ux-redesign.md           # Référence design de la refonte (Navigation Rapide, tablet-first...)
│   ├── git-ai-studio-workflow.md   # Guide Git → GitHub → Google AI Studio
│   ├── out-of-scope.md             # Liste d'exclusion V1 + note sur l'avenant "Gestion des tables"
│   ├── ux-guidelines.md            # Règles UX non-technicien + budget de clics (toujours valables)
│   ├── crud-matrix.md              # Toutes les entités (V1 + Gestion des tables) et leurs règles CRUD
│   └── modules/
│       ├── 01-dashboard-sales.md
│       ├── 02-products-recipes-margins.md
│       ├── 03-stock.md
│       ├── 04-suppliers-purchases-invoices.md
│       ├── 05-ocr-invoices.md
│       ├── 06-expenses.md
│       ├── 07-employees.md
│       ├── 08-reports-alerts-audit.md
│       ├── 09-website-digital-menu.md
│       ├── 10-onboarding-training.md
│       ├── 11-hosting-technical.md
│       └── 12-gestion-des-tables.md   # NOUVEAU — avenant, plan de salle visuel
└── prompts-ai-studio/
    ├── 00-comment-utiliser-ces-prompts.md
    ├── 01-import-projet-et-cadrage.md
    ├── 02-refonte-navigation-rapide-et-langage-visuel.md
    ├── 03-application-design-aux-modules-existants.md
    ├── 04-module-gestion-des-tables-plan-visuel.md
    ├── 05-responsive-tablette-desktop-mobile.md
    └── 06-validation-finale-ux-et-non-regression.md
```

## Principes clés (résumé)

1. **La refonte ne change que la présentation.** Aucune fonctionnalité, logique
   métier, permission ou flux déjà défini dans le cahier des charges ne doit
   changer à cause du redesign.
2. **Navigation Rapide, Accès Direct, Moins de clics.** Plus de barre latérale
   permanente — un déclencheur minimal ouvre un accès rapide animé à tous les
   modules et leurs actions directes.
3. **Tablet-first**, puis adaptation intelligente au desktop et au mobile — jamais
   un simple rétrécissement.
4. **Gestion des tables** est un nouveau module (avenant, hors cahier des charges
   V1 signé) : plan de salle visuel, tables en glisser-déposer, CRUD complet,
   espaces/étages multiples, statuts visuels, panneau contextuel de table
   sélectionnée.
5. **Toujours pas d'intelligence artificielle** dans le produit — y compris dans
   ce nouveau module (pas de placement de table "suggéré" par un algorithme).
6. **Zéro emoji, icônes professionnelles uniquement**, light-mode premium.

## Comment ce dépôt est utilisé

Ce dossier constitue le contenu initial d'un dépôt Git dédié au projet (voir
`docs/git-ai-studio-workflow.md`) : on le pousse sur GitHub, on importe ce dépôt
dans Google AI Studio, puis on développe l'application en donnant à AI Studio,
dans l'ordre, les prompts du dossier `prompts-ai-studio/`.
