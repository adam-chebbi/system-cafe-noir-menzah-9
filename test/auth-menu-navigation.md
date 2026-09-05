# Test manuel — Authentification & Menu Principal

Ce document décrit les scénarios de test manuel à exécuter dans le navigateur (aucun test
automatisé n'a été lancé par l'assistant).

**Prérequis**
- Lancer l'application : `npm run dev` (ou `npm run build && npm start` pour tester en conditions
  de production).
- Ouvrir un navigateur en navigation privée (pour partir sans session existante), ou vider le
  `sessionStorage` du site avant de commencer (Outils de développement → Application → Session
  Storage → clic droit → Clear).

---

## 1. Authentification obligatoire

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 1.1 | Ouvrir l'URL racine de l'application (`/`) sans session existante. | L'écran de connexion (code PIN) s'affiche immédiatement. Aucun contenu du menu ni d'aucun module n'est visible ou accessible. |
| 1.2 | Tenter d'ouvrir directement une URL de module, ex. `/?view=stock` ou `/?view=tb`, sans être connecté. | L'écran de connexion s'affiche quand même (le module demandé n'est jamais rendu tant que le code PIN n'a pas été validé). |
| 1.3 | Observer l'écran de connexion. | Design moderne cohérent avec l'identité visuelle du projet : carte claire sur fond sombre animé, logo/monogramme, titre, 8 emplacements de chiffres, clavier numérique tactile. |

---

## 2. Code PIN par défaut & connexion réussie

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 2.1 | Saisir le code `12345678` via le clavier numérique à l'écran (chiffre par chiffre). | Chaque chiffre saisi remplit un emplacement (point plein) dans l'affichage des 8 cases. |
| 2.2 | Après le 8ème chiffre. | La connexion se déclenche automatiquement (pas besoin de bouton "Valider") ; un court message "Vérification en cours..." peut apparaître. |
| 2.3 | Connexion réussie. | L'utilisateur est redirigé vers `/` et voit le **Menu Principal** (et non le Tableau de bord). L'URL affichée dans la barre d'adresse est bien `/` (sans paramètre `view`). |
| 2.4 | Saisir le PIN au clavier physique (chiffres du clavier) au lieu de cliquer les boutons à l'écran. | Fonctionne à l'identique (support clavier physique pour les tests sur ordinateur). |
| 2.5 | Recharger la page (F5) après une connexion réussie. | L'utilisateur reste connecté (retour direct au menu ou au module en cours), pas de nouvel écran de connexion. |
| 2.6 | Fermer complètement l'onglet/le navigateur, puis rouvrir l'application. | L'écran de connexion réapparaît (la session ne survit pas à la fermeture complète du navigateur). |

---

## 3. Échec de connexion

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 3.1 | Saisir un code PIN incorrect à 8 chiffres (ex. `00000000`). | Après le 8ème chiffre, un message d'erreur explicite apparaît ("Code PIN incorrect."), les 8 cases se vident, et une légère animation de secousse (shake) signale l'erreur. |
| 3.2 | Ressaisir immédiatement un nouveau code après une erreur. | La saisie fonctionne normalement, sans blocage ni nécessité de rafraîchir la page. |
| 3.3 | Utiliser le bouton "Effacer" pendant la saisie (avant les 8 chiffres). | Tous les chiffres déjà saisis sont retirés d'un coup. |
| 3.4 | Utiliser la touche retour arrière (icône ou touche clavier Backspace) pendant la saisie. | Seul le dernier chiffre saisi est retiré. |

---

## 4. Menu principal (`/`)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 4.1 | Observer le menu après connexion. | Un message d'accueil ("Bonjour, [Prénom]") avec la date du jour, sur un fond sombre animé, et exactement **8 boutons de module** organisés en grille. |
| 4.2 | Compter et lister les 8 boutons. | Dans l'ordre : Tableau de bord, Ventes, Produits, Stock, Achats & Fournisseurs & Factures, Équipe & Présence, Dépenses, Rapports Financiers & Rentabilité. Aucun bouton supplémentaire n'est présent. |
| 4.3 | Observer chaque bouton. | Chaque bouton a une icône claire, une couleur d'accent distincte (mais harmonieuse avec l'ensemble), un intitulé en français court, et une zone cliquable large. |
| 4.4 | Survoler un bouton (souris) ou le presser (tactile). | Une animation subtile (légère élévation + zoom de l'icône au survol, léger tassement à l'appui) confirme l'interactivité, sans être excessive. |
| 4.5 | Vérifier qu'aucune barre latérale ("sidebar") complexe ni menu de navigation classique n'encombre cette page. | Le menu est bien la seule interface : pas d'en-tête d'application, pas de tiroir de navigation rapide sur cette page précise. |

---

## 5. Navigation vers chacun des 8 modules

Pour chaque bouton, vérifier que le clic ouvre bien le bon module et que l'URL correspond à la
convention `?view=...` du projet.

| # | Bouton cliqué | Module attendu | Vérification URL |
|---|----------------|-----------------|-------------------|
| 5.1 | Tableau de bord | Le tableau de bord (KPIs, ventes du jour...) s'affiche. | `/?view=tb` |
| 5.2 | Ventes | Le module de saisie/historique des ventes (POS) s'affiche. | `/?view=pos` |
| 5.3 | Produits | Le catalogue produits & fiches techniques s'affiche. | `/?view=products` |
| 5.4 | Stock | Le module de gestion du stock s'affiche. | `/?view=stock` |
| 5.5 | Achats & Fournisseurs & Factures | Le module fournisseurs/achats/factures OCR s'affiche. | `/?view=suppliers` |
| 5.6 | Équipe & Présence | Le module RH (employés, planning, présence) s'affiche. | `/?view=hr` |
| 5.7 | Dépenses | Le registre des dépenses s'affiche. | `/?view=expenses` |
| 5.8 | Rapports Financiers & Rentabilité | Le module rapports/alertes/journal s'affiche (onglet Rapports actif par défaut). | `/?view=reports` |

---

## 6. Accès direct par URL

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 6.1 | Une fois connecté, saisir directement `/?view=tb` dans la barre d'adresse. | Le Tableau de bord s'affiche directement, sans repasser par le menu. |
| 6.2 | Revenir en arrière avec le bouton "Précédent" du navigateur après avoir ouvert un module depuis le menu. | Le navigateur revient correctement au menu (`/`), conformément à l'historique de navigation. |
| 6.3 | Copier-coller l'URL d'un module ouvert (ex. `/?view=stock`) dans un nouvel onglet **où une session est déjà active**. | Le module s'ouvre directement dans le nouvel onglet. |

---

## 7. Retour au menu depuis un module

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 7.1 | Ouvrir n'importe quel module (ex. Stock). Observer l'en-tête de l'application. | Un bouton clairement identifiable "← MENU" (flèche + texte) est visible en haut à gauche de l'en-tête, avant l'icône du module actif. |
| 7.2 | Cliquer sur ce bouton "← MENU". | L'utilisateur revient immédiatement au Menu Principal (`/`), sans confirmation nécessaire. |
| 7.3 | Répéter l'opération depuis chacun des 8 modules. | Le comportement est identique et cohérent partout : le bouton "← MENU" est toujours présent et fonctionnel dès qu'un module est ouvert. |
| 7.4 | Sur un écran étroit (mobile), vérifier le bouton "← MENU". | La flèche reste visible même si le texte "MENU" est masqué pour gagner de la place ; le bouton reste cliquable. |

---

## 8. Verrouillage de session (bonus lié à l'authentification)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 8.1 | Depuis un module, cliquer sur l'avatar utilisateur (pastille ronde en haut à droite). | La session se verrouille : l'écran de connexion par code PIN réapparaît immédiatement. |
| 8.2 | Ressaisir le code PIN `12345678`. | La reconnexion fonctionne et ramène au Menu Principal. |

---

## 9. Comportement responsive (desktop, tablette, mobile)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 9.1 | Afficher le menu sur une largeur de bureau (≥ 1280 px). | Les 8 boutons sont bien organisés en grille **4 colonnes × 2 lignes**. |
| 9.2 | Réduire la fenêtre à une largeur de tablette (~768–1024 px). | La grille 4×2 reste lisible et bien proportionnée ; aucun texte n'est coupé ; aucune barre de défilement horizontale n'apparaît. |
| 9.3 | Réduire à une largeur de mobile (~375–430 px). | La grille se réorganise en **2 colonnes** (4 lignes) pour rester confortablement tactile ; tous les libellés restent lisibles (retour à la ligne si nécessaire) ; toujours aucun défilement horizontal. |
| 9.4 | Vérifier l'écran de connexion aux mêmes largeurs. | La carte de connexion et le clavier numérique restent centrés, lisibles et entièrement utilisables à chaque taille, sans débordement. |
| 9.5 | Vérifier le contraste texte/icônes sur le fond animé (menu et connexion). | Le texte du message d'accueil (blanc/clair) reste parfaitement lisible sur le fond sombre ; le texte des boutons (sombre) reste parfaitement lisible sur leur fond clair, à tout moment de l'animation. |

---

## 10. Fond animé & expérience visuelle

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 10.1 | Observer le fond de l'écran de connexion et du menu pendant au moins 30 secondes, sans interagir. | Des formes lumineuses douces se déplacent très lentement et changent progressivement d'intensité ; le mouvement est continu, discret, et ne capte jamais davantage l'attention que le contenu (boutons, texte). |
| 10.2 | Comparer l'animation à un module ouvert (ex. Stock, Ventes). | Aucune animation de fond n'apparaît dans les modules : ce traitement est réservé à l'écran de connexion et au menu principal, l'interface des modules reste sobre et inchangée. |
| 10.3 | Activer "Réduire les animations" / "Prefers reduced motion" dans les paramètres d'accessibilité du système d'exploitation ou du navigateur, puis recharger. | Le fond reste statique (sans mouvement continu), tout en conservant les mêmes couleurs et la même mise en page — l'application respecte la préférence d'accessibilité. |
| 10.4 | Vérifier qu'aucune animation ne gêne la lecture ou le clic sur les boutons. | Les transitions restent subtiles ; aucun élément ne tremble, ne clignote fortement, ni ne se déplace de façon imprévisible pendant l'utilisation normale. |

---

## Points de vigilance transverses

- **Aucune fuite de données avant connexion** : tant que le code PIN n'a pas été validé, aucune
  requête vers les données métier (ventes, stock, RH...) ne doit être visible dans l'onglet Réseau
  des outils de développement.
- **Session propre** : le code PIN par défaut est `12345678` (compte administrateur unique) ; il
  n'existe pas d'autre identifiant à tester en V1.
- **Cohérence du système de design** : polices, couleurs, arrondis et ombres de l'écran de
  connexion et du menu doivent rester visuellement cohérents avec le reste de l'application
  (en-têtes de module, cartes, boutons), et non provenir d'une charte graphique différente.
- **`/` reste le menu, jamais un module** : quelle que soit la manière dont on y revient (bouton
  MENU, bouton "précédent" du navigateur, ou saisie manuelle de l'URL racine), `/` doit toujours
  afficher le menu à 8 boutons, jamais directement le Tableau de bord ou un autre module.
