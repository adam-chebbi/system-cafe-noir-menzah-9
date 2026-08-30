# Prompt 16 — Passe responsive tablette-first, desktop, mobile

Copie ce texte tel quel dans Google AI Studio une fois le prompt 15 terminé et
validé.

---

Fais maintenant une passe complète de vérification et de rattrapage responsive sur
l'ensemble de l'application, en te basant sur `docs/ui-ux-redesign.md` section 4.
Chaque écran devait déjà être pensé tablette d'abord au moment de sa construction
— ce prompt sert à vérifier que c'est bien le cas partout et à corriger les
oublis, pas à découvrir le responsive pour la première fois.

Pour chaque module déjà construit (Tableau de bord/Ventes, Produits/Recettes,
Stock, Fournisseurs/Factures, OCR, Dépenses, Employés, Rapports/Alertes/Audit,
Site/Menu digital, Gestion des tables), vérifie et corrige si besoin :

- **Tablette (référence principale)** : l'écran est-il confortable au doigt, avec
  des cibles tactiles suffisamment grandes, un espacement confortable, aucune zone
  minuscule demandant de la précision ?
- **Ordinateur (espace de travail élargi)** : l'écran exploite-t-il l'espace
  disponible pour afficher plus d'informations utiles en parallèle (par exemple le
  panneau de table sélectionnée à côté du plan plutôt qu'en superposition), plutôt
  que de simplement agrandir les composants tablette ?
- **Mobile (expérience compacte)** : l'écran se réorganise-t-il intelligemment
  (empilement, priorité aux actions les plus fréquentes, panneau contextuel en
  plein écran plutôt qu'en colonne latérale) plutôt que de simplement rétrécir la
  mise en page desktop ?
- **Navigation Rapide** : le déclencheur et l'expérience de navigation animée
  restent-ils utilisables et lisibles sur les trois formats, avec des transitions
  qui restent fluides même sur un appareil moins puissant ?
- **Glisser-déposer du plan de salle** : fonctionne-t-il aussi bien au doigt sur
  tablette qu'à la souris sur desktop ? Une alternative sans glisser-déposer
  (par exemple une sélection puis un bouton "déplacer ici") doit-elle être prévue
  pour les cas où le geste serait difficile à réaliser précisément sur un petit
  écran mobile ?
- **Formulaires** : le patron `Formulaire → Aperçu → Confirmer` reste-t-il rapide à
  parcourir sur mobile, sans défilement excessif ni perte du fil ?

Corrige tout écran qui ne respecterait pas ces critères. Termine par un résumé,
module par module, de ce qui a été vérifié et de ce qui a été corrigé.
