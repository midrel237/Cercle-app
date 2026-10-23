# Maquette Cercle — Modifications V2 (post-audit, PR #38)

> **Objectif** : mettre à jour la maquette (`Cercle_maquettes_ecrans.html`) et son export PDF pour refléter l'état réel du projet après l'audit de couverture des 80 écrans.
> **Résultat attendu** : **71 écrans** (80 − 9 retirés), numérotation d'origine conservée.

---

## 1. Écrans à RETIRER (9)

Leurs cartes doivent disparaître complètement de la maquette et du PDF.

| # | Écran | Section | Raison | Destination réelle |
|---|---|---|---|---|
| 08 | KYC — Capture recto de la pièce | Inscription & sécurité | Délégué au partenaire | Flux hébergé **Didit** |
| 09 | KYC — Capture verso de la pièce | Inscription & sécurité | Délégué au partenaire | Flux hébergé **Didit** |
| 10 | KYC — Vérification des photos | Inscription & sécurité | Délégué au partenaire | Flux hébergé **Didit** |
| 11 | KYC — Selfie de vérification | Inscription & sécurité | Délégué au partenaire | Flux hébergé **Didit** |
| 12 | KYC — Informations complémentaires | Inscription & sécurité | Délégué au partenaire | Flux hébergé **Didit** |
| 36 | Paiement — Ajouter une carte bancaire | Vie quotidienne du groupe | Fusion UX | **Onglet « Carte »** de l'écran 35 (`/payment/add-method`) |
| 37 | Paiement — Ajouter un virement | Vie quotidienne du groupe | Fusion UX | **Onglet « Virement »** de l'écran 35 (`/payment/add-method`) |
| 38 | Paiement — Confirmation Mobile Money | Vie quotidienne du groupe | Parcours réel | **Écran 33** (`/payment/processing`, polling webhook) |
| 62 | Prêts — Signature électronique | Prêts internes | Fusion UX | **Écran 63** (`/loan/[id]/contract`, case d'acceptation + signature PIN) |

---

## 2. En-tête de la maquette à MODIFIER

| Avant | Après |
|---|---|
| « 80 écrans organisés selon le parcours réel de l'utilisateur, en 10 sections » | « **71 écrans** organisés selon le parcours réel de l'utilisateur, en 10 sections » |

---

## 3. Écran 04 (Connexion) à METTRE À JOUR

L'implémentation réelle (login PIN-first, PR #38) remplace la saisie numéro + OTP pour la **reconnexion** :

**Nouveau contenu de la carte 04 · AUTHENTIFICATION — Connexion :**

- Bon retour
- Entrez votre code PIN pour ouvrir Cercle
- **+237 6 77 XX XX XX** (lecture seule, texte or)
- 4 cases de saisie PIN (motif maquette écrans 16-17)
- Continuer
- Code PIN oublié ? · Créer un compte

> Note : le parcours numéro + OTP reste celui de l'**inscription** (écran 05) et de la récupération (« Code PIN oublié ? » → renvoi SMS).

---

## 4. Notes de traçabilité à AJOUTER en bas de section

- **Section INSCRIPTION & SÉCURITÉ** :
  « Écrans 08-12 intégrés au flux Didit (partenaire d'identité). »
- **Section VIE QUOTIDIENNE DU GROUPE** :
  « Écrans 36-38 intégrés aux écrans 35 (onglets) et 33 (processing). »
- **Section PRÊTS INTERNES** :
  « Écran 62 intégré au contrat (écran 63). »

---

## 5. Règles de numérotation

- **NE PAS renuméroter** : conserver les numéros d'origine (01…80) avec les trous aux 08-12, 36-38 et 62.
- Les numéros correspondent aux commentaires `// Écran NN` du code source (`apps/mobile/app/**`) — une renumérotation casserait la correspondance code ↔ maquette.
- Le PDF final mentionnera : « La numérotation d'origine est conservée pour correspondre aux commentaires du code (trous intentionnels aux 08-12, 36-38 et 62). »

---

## 6. Écrans CONSERVÉS sans changement

Tous les autres écrans restent tels quels, y compris leurs contenus et libellés (exemples Amina / Marthe B. / Robert T. / Sarah K.) :

- **Découverte** : 01, 02, 03
- **Inscription & sécurité** : 04 (mis à jour, §3), 05, 06, 07, 13, 14, 15, 16, 17, 18, 19, 20
- **Premier accès** : 21, 22
- **Créer / rejoindre un groupe** : 23, 24, 25, 26, 27, 28, 29, 30
- **Vie quotidienne du groupe** : 31, 32, 33, 34, 35, 39, 40, 41
- **Membres & administration** : 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53
- **Évènements communautaires** : 54, 55, 56
- **Prêts internes** : 57, 58, 59, 60, 61, 63, 64, 65, 66
- **Suivi & traçabilité** : 67, 68, 69, 70, 71
- **Profil & paramètres** : 72, 73, 74, 75, 76, 77, 78, 79, 80

---

## 7. Dernière page du PDF (à ajouter)

Tableau « Écrans retirés → destination » :

| Écran(s) retiré(s) | Destination |
|---|---|
| 08-12 (captures KYC) | Flux hébergé Didit (partenaire) |
| 36-37 (carte / virement) | Écran 35 — onglets « Carte » / « Virement » |
| 38 (confirmation Mobile Money) | Écran 33 — processing (polling webhook) |
| 62 (signature électronique) | Écran 63 — contrat (case d'acceptation + signature PIN) |

---

## 8. Structure du PDF V2

1. **Couverture** : « Cercle · Maquettes UI » / « V2 · 71 écrans · mise à jour post-audit — octobre 2026 » / roue de rotation signature / palette navy-or.
2. **10 pages de sections** (une par section, cartes compactes en grille) :
   Découverte · Inscription & sécurité · Premier accès · Créer/rejoindre un groupe · Vie quotidienne du groupe · Membres & administration · Évènements communautaires · Prêts internes · Suivi & traçabilité · Profil & paramètres.
3. **Page finale** : tableau de correspondance (§7) + note de numérotation (§5).

---

*Document généré après l'audit complet maquette ↔ routes du projet (PR #38, branche `fix/nav-icons-session-groups-kyc-return`).*
