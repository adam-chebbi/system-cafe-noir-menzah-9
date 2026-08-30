# Prompt 13 — Module Site internet & Menu digital

Copie ce texte tel quel dans Google AI Studio une fois le prompt 12 terminé et
validé.

---

Construis le module Site internet & Menu digital tel que décrit dans
`docs/modules/09-website-digital-menu.md` (cahier des charges §10). Ce module est
**public** (accessible sans authentification) : sa direction visuelle peut suivre
une identité de marque légèrement distincte du back-office administrateur, mais
doit rester cohérente avec la qualité générale définie dans
`docs/ui-ux-redesign.md` (clarté, absence d'emoji, icônes professionnelles).

Points fonctionnels essentiels :

- Site public responsive avec les pages Accueil, Menu, À propos/Concept, Galerie,
  Contact/Localisation, gérables depuis l'administration avec le principe
  "modifier → aperçu → confirmer/publier". Le site peut afficher adresse,
  téléphone, horaires, une carte et des liens vers les réseaux sociaux. N'ajoute
  ni réservation en ligne, ni commande en ligne, ni paiement en ligne.
- Menu digital entièrement dérivé du catalogue produit déjà construit (prompt 6) :
  aucune saisie séparée. Toute modification de prix validée se répercute
  automatiquement sur le menu public.
- Pour un produit indisponible : choix entre le masquer complètement ou l'afficher
  marqué "indisponible", avec un réglage par défaut global et une possibilité de
  forcer un choix différent produit par produit.
- Menu public navigable par catégories/sous-catégories, avec recherche, photos,
  descriptions, variantes, suppléments, prix — **sans jamais exposer** coûts
  matière, marges, recettes ou toute autre information interne, à aucun niveau de
  l'API ou de l'interface publique.
- URL publique directe et stable pour le menu (destinée à être associée à un QR
  code fourni séparément), sans authentification requise pour le consulter.
- Vérifie que ce module n'ouvre par erreur l'accès à aucune route d'administration
  protégée depuis l'authentification mise en place au prompt 4.

Rends ce module démontrable avec le **catalogue réel déjà créé au prompt 6** :
vérifie que chaque produit, sa photo, sa description, ses variantes et son prix
apparaissent correctement, que la recherche fonctionne, et qu'un produit rendu
indisponible se comporte comme attendu selon le réglage choisi.

Termine par une vérification explicite, exemple à l'appui, qu'aucune information
interne n'apparaît nulle part dans le HTML, le JSON ou toute réponse réseau visible
depuis le menu public.
