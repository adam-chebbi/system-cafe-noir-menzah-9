# Guide de test manuel — Planning & présence (Équipe & présence)

Ce guide couvre la refonte du module **Équipe & présence → Planning & présence** : planning
récurrent hebdomadaire par employé, exceptions ponctuelles, centre de pilotage RH master-detail.

Aucun test automatisé/navigateur n'est fourni : suivez les scénarios ci-dessous directement dans
l'application (`Menu → Équipe & présence → Planning & présence`).

Deux employés de démonstration sont déjà configurés dans les données de départ :
- **Lucas Morel** — Matin (07:30–15:30) tous les jours, **repos récurrent le mardi**.
- **Sophie Dubois** — Soir (15:30–23:00) tous les jours, **repos récurrent le dimanche**.

---

## 1. Vue d'ensemble de la grille

1. Ouvrir l'onglet **Planning & présence**.
2. Vérifier que la grille affiche une ligne par employé actif et une colonne par jour de la
   semaine en cours (Lundi → Dimanche), avec la date sous chaque jour et la colonne du jour
   courant surlignée.
3. Vérifier la **légende** en haut : statuts (Présent/Absent/Congé/Retard/Repos), shifts
   (Matin/Soir), et la distinction visuelle **Règle récurrente vs Exception ponctuelle**.
4. Pour **Lucas Morel** :
   - Les jours Lundi, Mercredi, Jeudi, Vendredi, Samedi affichent un badge discret (contour
     léger, pas de couleur "pleine") avec "Matin 07:30–15:30".
   - Le **Mardi** affiche "Repos" en style discret avec la mention "récurrent" — sans le petit
     point d'exception dans le coin de la cellule.
5. Pour **Sophie Dubois** : même logique avec "Soir 15:30–23:00" du lundi au samedi et repos le
   dimanche.

✅ **Attendu** : aucune cellule n'est vide/à configurer pour ces deux employés — la règle
récurrente couvre déjà toute la semaine, indéfiniment, sans qu'aucune donnée n'ait été saisie
jour par jour.

---

## 2. Navigation semaine précédente / suivante / Aujourd'hui

1. Cliquer sur la flèche gauche (semaine précédente), puis droite (semaine suivante) plusieurs
   fois — y compris en avançant de plusieurs mois dans le futur (ex. décembre).
2. Vérifier que **Lucas reste en repos tous les mardis** et **Sophie tous les dimanches**, quelle
   que soit la semaine affichée, sans aucune action manuelle.
3. Cliquer sur **Aujourd'hui** : la grille doit revenir à la semaine contenant la date du jour.

✅ **Attendu** : la règle se répète automatiquement à l'infini (aucune donnée n'est pré-générée en
base — c'est calculé à la volée).

---

## 3. Exception ponctuelle — "ce jour uniquement" (ne casse pas la règle)

Scénario de l'énoncé : Lucas travaille normalement le lundi, il est déclaré **Congé** le lundi de
la semaine affichée.

1. Cliquer sur la cellule du **lundi** de Lucas Morel → le panneau latéral droit "Édition rapide
   du jour" s'ouvre.
2. Vérifier le bandeau d'état : il indique le planning récurrent actuel ("Matin 07:30–15:30").
3. Dans **Action rapide**, cliquer sur **Congé**.
4. Laisser "Étendre sur plusieurs jours" décoché (congé d'un seul jour).
5. Cliquer **Enregistrer**.
6. Vérifier dans la grille : la cellule du lundi affiche maintenant "Congé" en couleur pleine
   (violet), **avec un petit point sombre dans le coin supérieur droit** (indicateur
   d'exception).
7. Naviguer vers la **semaine suivante** : le lundi de Lucas doit être revenu automatiquement à
   "Matin 07:30–15:30" (règle récurrente), preuve que l'exception ne s'est appliquée qu'à ce seul
   lundi.
8. Revenir sur le lundi modifié, rouvrir le panneau du jour : un bouton **"Revenir au planning
   récurrent"** doit être visible en bas du panneau. Cliquer dessus → confirmer dans la boîte de
   dialogue → le lundi redevient "Matin 07:30–15:30" sans point d'exception.

✅ **Attendu** : une modification ponctuelle ne modifie jamais la règle récurrente ; elle peut être
annulée pour revenir instantanément au planning habituel.

---

## 4. Statut **Retard** — heure d'arrivée réelle

1. Cliquer sur une cellule d'un jour normalement travaillé (ex. mercredi de Lucas).
2. Dans **Action rapide**, choisir **Retard**.
3. Vérifier que le **shift prévu** (Matin, 07:30–15:30) reste affiché/éditable — il n'est pas
   effacé.
4. Renseigner **Heure d'arrivée réelle** = `08:05`.
5. Vérifier l'affichage live : **"Retard de 35 min"** sous le champ.
6. Enregistrer.
7. Vérifier dans la grille : la cellule affiche "Retard", l'horaire prévu, et en dessous
   "Arrivée 08:05 (+35min)".

✅ **Attendu** : le shift prévu est conservé, l'heure réelle et le retard calculé sont visibles
directement dans la cellule.

---

## 5. Statut **Absent**

1. Cliquer sur un jour normalement travaillé de Sophie Dubois.
2. Choisir **Absent** dans les actions rapides.
3. Vérifier que le shift (Soir, 15:30–23:00) reste affiché dans le panneau, sous la mention
   "(prévu — conservé pour référence)".
4. Enregistrer, puis vérifier la cellule dans la grille : badge "Absent" (rouge) avec le point
   d'exception, sans horaires affichés dans la cellule (le shift reste en contexte dans le
   panneau mais la cellule met en avant le statut).

✅ **Attendu** : le shift prévu n'est jamais perdu — il reste visible en cas de besoin, seul le
statut du jour change.

---

## 6. Statut **Congé** sur une période de plusieurs jours

1. Cliquer sur une cellule (ex. jeudi de Lucas).
2. Choisir **Congé**, cocher **"Étendre sur plusieurs jours"**.
3. Choisir une date de fin 4 jours plus tard.
4. Enregistrer.
5. Vérifier dans la grille : les 4 jours (jeudi → dimanche suivant, selon la période choisie)
   affichent "Congé" avec le point d'exception.
6. Rouvrir le panneau sur l'un des jours de la période : le bouton en bas doit indiquer
   **"Supprimer toute la période"** (et non "Revenir au planning récurrent" pour un seul jour).
7. Cliquer dessus → confirmer → vérifier que **les 4 jours** redeviennent conformes au planning
   récurrent d'un coup.

✅ **Attendu** : les jours d'une même période de congé sont liés et peuvent être gérés (et
supprimés) ensemble.

---

## 7. Repos récurrent vs Repos exceptionnel

1. Sur le **mardi** de Lucas (repos récurrent) : la cellule affiche "Repos" en style discret,
   **sans** point d'exception, avec la mention "récurrent".
2. Choisir un jour normalement travaillé (ex. vendredi de Sophie) et lui appliquer l'action
   rapide **Repos** → Enregistrer.
3. Vérifier que ce vendredi affiche désormais "Repos" en couleur pleine **avec** le point
   d'exception — visuellement différent du mardi récurrent de Lucas.

✅ **Attendu** : les deux types de repos sont immédiatement distinguables à l'œil.

---

## 8. "Configurer la semaine type" — portées de modification

### 8.a Premier réglage d'un nouvel employé (aucune confirmation requise)

1. Créer un nouvel employé actif dans l'onglet **Employés** (ex. "Test Employé").
2. Retourner sur **Planning & présence** : ses 7 jours affichent "+ Configurer" (non configuré),
   et l'alerte "X alertes" dans la barre d'outils doit augmenter de 1 (planning non configuré).
3. Dans la barre d'outils, utiliser le sélecteur **"Configurer la semaine type"** → choisir "Test
   Employé".
4. Définir un planning (ex. Lundi–Vendredi Matin, Samedi–Dimanche Repos) et cliquer
   **Enregistrer** avec la portée **"À partir de cette date"** (par défaut).
5. Comme aucun planning n'existait avant, l'enregistrement doit se faire **sans boîte de
   confirmation** (premier réglage = non "important").
6. Vérifier que la grille affiche maintenant le planning configuré pour tous les jours, y compris
   en naviguant plusieurs semaines dans le futur.

### 8.b Modification "à partir de cette date" (changement permanent, confirmation requise)

1. Rouvrir "Configurer la semaine type" pour **Lucas Morel**.
2. Changer son shift du Mercredi de Matin à Soir.
3. Garder la portée **"À partir de cette date"**, choisir une date dans ~2 semaines.
4. Cliquer Enregistrer → une **boîte de confirmation** doit apparaître (changement permanent d'une
   règle déjà établie).
5. Confirmer.
6. Naviguer sur une semaine **avant** la date choisie : le mercredi de Lucas doit toujours afficher
   "Matin" (ancienne règle, historique préservé).
7. Naviguer sur une semaine **après** la date choisie : le mercredi doit afficher "Soir" (nouvelle
   règle).

✅ **Attendu** : le changement ne s'applique qu'à partir de la date choisie ; les semaines passées
gardent l'ancienne règle intacte (aucune réécriture d'historique).

### 8.c Modification "cette semaine uniquement" (exception massive, confirmation requise)

1. Rouvrir "Configurer la semaine type" pour Sophie Dubois, en étant positionné sur la semaine
   affichée actuelle.
2. Changer le Samedi de Soir à Repos.
3. Choisir la portée **"Cette semaine uniquement"**.
4. Cliquer Enregistrer → boîte de confirmation (modification massive/ponctuelle) → confirmer.
5. Vérifier que **seule la semaine affichée** a son samedi en "Repos" (avec point d'exception).
6. Naviguer à la semaine suivante : le samedi de Sophie doit être revenu à "Soir" (la règle
   récurrente n'a pas été modifiée).

✅ **Attendu** : seuls les jours réellement différents de la règle actuelle génèrent une exception
(si vous rouvrez l'éditeur sans rien changer et sauvegardez "cette semaine uniquement", aucune
nouvelle exception ne doit être créée pour les jours identiques à la règle).

---

## 9. Édition rapide directement depuis une cellule

1. Cliquer n'importe quelle cellule de la grille : le panneau latéral doit s'ouvrir **sans
   fenêtre modale plein écran** (juste un panneau docké à droite, contenu compact).
2. Vérifier que le shift et les horaires sont modifiables directement dans ce panneau (boutons
   Matin/Soir + champs heure), sans navigation supplémentaire.

---

## 10. Panneau détail employé (clic sur le nom)

1. Cliquer sur le **nom** d'un employé (colonne de gauche, pas une cellule de jour) → le panneau
   bascule en mode "Détail employé".
2. Vérifier :
   - Le **résumé hebdomadaire** (jours travaillés, repos, absences, congés, retards, heures
     prévues) correspond à ce qui est affiché dans la grille pour cette semaine.
   - La liste des **7 jours du planning récurrent actuel**.
   - Le bouton **"Configurer la semaine type"** en bas.
3. Depuis le panneau "Édition rapide du jour", cliquer le lien **"Voir le planning complet de
   ..."** → vérifier que ça bascule bien vers le panneau détail employé.

---

## 11. Dupliquer un planning vers un autre employé

1. Ouvrir le panneau détail de **Sophie Dubois**.
2. Dans "Dupliquer ce planning vers...", choisir **Lucas Morel** dans la liste.
3. Cliquer **Dupliquer** → une boîte de confirmation apparaît (action qui remplace le planning
   existant du destinataire) → confirmer.
4. Vérifier que le planning récurrent de Lucas (à partir d'aujourd'hui) correspond maintenant à
   celui de Sophie (Soir, repos dimanche).
5. Naviguer sur une semaine passée : Lucas doit toujours afficher son **ancien** planning
   (historique préservé, seule la suite change).

---

## 12. Conflits / anomalies de planning

1. Dans la barre d'outils, si le badge **"X alertes"** est visible, cliquer dessus.
2. Vérifier la liste : elle doit inclure les employés sans planning configuré, et tout jour de la
   semaine affichée où **aucun employé actif** n'est prévu au travail (essayez de mettre tous les
   employés en Repos/Congé le même jour pour déclencher ce cas).

---

## 13. Cohérence des données (vérification API, optionnel/avancé)

Pour vérifier que le moteur ne casse jamais l'historique, on peut inspecter directement les
données via les endpoints :

- `GET /api/hr/schedule-templates?employeeId=emp_1` — doit lister toutes les versions du planning
  récurrent de Lucas, avec `effectiveFrom`/`effectiveTo` qui s'enchaînent sans chevauchement.
- `GET /api/hr/presence?start=AAAA-MM-JJ&end=AAAA-MM-JJ&employeeId=emp_1` — ne doit contenir que
  les jours où une exception a réellement été posée (pas un enregistrement par jour).

---

## Résumé des points de contrôle clés

| Fonctionnalité | Où le vérifier |
|---|---|
| Répétition automatique de la règle chaque semaine | Naviguer plusieurs semaines/mois, sans ressaisie |
| Exception ne casse pas la règle | §3, §7 |
| Retard conserve le shift + heure réelle | §4 |
| Absent conserve le shift prévu | §5 |
| Congé multi-jours + suppression groupée | §6 |
| Repos récurrent ≠ Repos exceptionnel (visuel) | §7 |
| "Ce jour" / "Cette semaine" / "À partir de cette date" | §3, §8 |
| Confirmations uniquement sur actions importantes/massives | §8.a (aucune) vs §8.b/§8.c (confirmées) |
| Édition rapide sans grosse fenêtre | §9 |
| Master-detail (clic employé → détail) | §10 |
| Duplication entre employés | §11 |
| Anomalies/conflits | §12 |
