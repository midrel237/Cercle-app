# Cercle — Plateforme de tontine digitalisée (Njangi)

Monorepo du MVP, conforme au *Cahier des charges Tontine App* (stack §6.1) et
à la maquette `Cercle_maquettes_ecrans.html` (80 écrans).

## Stack

| Composant | Choix |
|---|---|
| Application mobile | React Native + Expo, Expo Router |
| Backend | Node.js / NestJS, API REST |
| Base de données | PostgreSQL (Prisma ORM) |
| Paiement Mobile Money | Agrégateur (CinetPay/Maviance) — Option A "facilitateur technique" |
| Notifications | Expo Notifications + SMS de secours |
| Authentification | JWT + Expo Secure Store + biométrie (Expo Local Authentication) |

## Structure du monorepo

```
tontine-app/
├── apps/
│   ├── mobile/        # App Expo Router (80 écrans de la maquette, en placeholders)
│   └── backend/       # API NestJS (auth, users, groups, transactions/ledger, loans, payments, notifications)
├── packages/
│   └── shared/        # Types TypeScript partagés (User, Group, LedgerTransaction, Loan...)
├── package.json        # Workspaces npm racine
└── .env.example
```

## Prérequis (important sous Windows)

- **Node.js** : ce projet exige `^20.19.4`, `^22.13.0` ou `>=24.3.0`
  (intersection des exigences de `react-native@0.86`/Metro et de
  `prisma@7` — voir `package.json` → `engines`, désormais vérifié
  automatiquement via `engine-strict=true` dans `.npmrc`). Node 22.11 ou
  22.12 par exemple ne suffisent pas : il faut au moins 22.13 sur la
  branche 22.x. **Le plus simple reste Node 24 (24.3.0 ou plus récent,
  ex. 24.19)** : c'est la seule des trois plages sans limite haute connue.
  Vérifie avec `node -v`, et mets à jour si besoin (nvm-windows ou
  installeur officiel).
- **Ne travaille pas dans un dossier synchronisé par OneDrive** (ce qui
  est le cas par défaut de `Downloads`, `Documents`, `Bureau` sur beaucoup
  de PC Windows pro/perso). OneDrive verrouille des fichiers pendant sa
  synchronisation, ce qui provoque des erreurs `ENOTEMPTY` / `EPERM` lors
  du `npm install` (React Native et Expo créent des milliers de petits
  fichiers). Déplace plutôt le projet dans un chemin court hors
  OneDrive, par ex. `C:\dev\tontine-app`.
- **Active les chemins longs Windows** (react-native génère des chemins
  de fichiers très profonds) : en PowerShell, en administrateur :
  ```powershell
  New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
    -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
  ```
  puis redémarre le PC.
- Si `npm install` s'arrête avec une erreur réseau (`ECONNRESET`,
  `ETIMEDOUT`) : c'est presque toujours une coupure pendant le
  téléchargement d'un gros paquet (React Native, Expo, moteurs Prisma) —
  relance simplement `npm install`, npm reprend là où c'est resté sans
  tout retélécharger. Si ça persiste, vérifie un éventuel proxy/VPN
  d'entreprise (`npm config get proxy`) et désactive temporairement
  l'antivirus en temps réel sur le dossier du projet.

## Base de données PostgreSQL — deux façons de faire

### Option A — Docker (recommandé si déjà installé)

```bash
docker compose up -d
```

Si tu obtiens `docker: The term 'docker' is not recognized...`, c'est que
Docker Desktop n'est pas installé, ou installé mais pas ajouté au PATH /
pas encore redémarré. Sur Windows, installe **Docker Desktop**
(https://www.docker.com/products/docker-desktop/), qui exige WSL2 (le
programme d'installation propose de l'activer automatiquement) — puis
**redémarre complètement le PC**, pas seulement le terminal. Vérifie
ensuite avec `docker --version`.

Docker Desktop demande de la virtualisation activée dans le BIOS et des
droits administrateur ; sur un PC d'entreprise géré, ça peut être bloqué
par une politique IT. Dans ce cas, utilise l'option B ci-dessous — aucune
des deux n'est "meilleure", ce sont deux façons équivalentes d'obtenir la
même base PostgreSQL locale.

### Option B — PostgreSQL installé nativement (sans Docker)

1. Télécharge et installe PostgreSQL 16 depuis
   https://www.postgresql.org/download/windows/ (l'installeur EDB propose
   aussi pgAdmin, pratique mais optionnel).
2. Pendant l'installation, note le mot de passe choisi pour l'utilisateur
   `postgres` (le super-utilisateur) — il servira uniquement à l'étape
   suivante.
3. Ouvre **SQL Shell (psql)** (installé avec PostgreSQL, dans le menu
   Démarrer) et exécute :
   ```sql
   CREATE USER tontine WITH PASSWORD 'tontine';
   CREATE DATABASE tontine_db OWNER tontine;
   ```
   Ces identifiants correspondent exactement au `DATABASE_URL` déjà
   présent dans `apps/backend/.env` — aucune autre configuration n'est
   nécessaire.
4. Vérifie que le service **postgresql-x64-16** tourne (Services Windows,
   ou `Get-Service postgresql*` en PowerShell) ; il démarre automatiquement
   au boot par défaut.

Dans les deux cas, la suite (`npx prisma migrate dev`) est identique.

## Démarrage

```bash
npm install                       # installe tous les workspaces
cp .env.example apps/backend/.env # puis renseigner DATABASE_URL, secrets JWT, etc.

# Backend
npm run backend:migrate           # applique le schéma Prisma sur PostgreSQL
npm run backend                   # démarre l'API sur http://localhost:3000/api/v1

# Mobile (autre terminal)
npm run mobile                    # démarre Expo (scanner le QR code avec Expo Go)
```

## État actuel (étape "structure du projet")

- ✅ Monorepo npm workspaces (`apps/*`, `packages/*`)
- ✅ Types partagés mobile/backend (`@tontine/shared`)
- ✅ Backend NestJS : modules `auth`, `users` (KYC), `groups` (dont désignation du caissier
  et compte de dépôt), `transactions` (ledger central), `loans` (demande/vote/contrat),
  `events` (cagnottes deuil/anniversaire/naissance/mariage/maladie), `payments` (abstraction
  agrégateur Mobile Money + webhook), `notifications` — squelettes fonctionnels avec DTOs
  validés, à brancher sur la logique métier réelle.
- ✅ Schéma PostgreSQL complet (`prisma/schema.prisma`) reflétant le ledger central et les prêts.
- ✅ Mobile Expo Router : arborescence de routes pour les 80 écrans de la maquette,
  regroupés par flux (`(auth)`, `(kyc)`, `(onboarding)`, `(tabs)`, `group/`, `loan/`, `payment/`,
  `settings/`). Écrans 1 à 5 (`splash`, `language`, `welcome`, `login`, `otp`), 79
  (`country-picker`) et 80 (`create-account`) implémentés fidèlement à
  la maquette ; les autres restent en écran placeholder en attendant leur tour (voir
  `docs/screens-map.md`).
- ✅ Thème (couleurs, typographies Fraunces/Inter/IBM Plex Mono) extrait de la maquette.
- ✅ i18n FR/EN de base.

## Audit de cohérence (juillet 2026) — corrections apportées

Une revue de cohérence a comparé le cahier des charges, le schéma Prisma, les DTOs
et la maquette (80 écrans), à la lumière du fonctionnement réel des tontines
traditionnelles camerounaises (njangi). Décisions prises et appliquées :

- **Diaspora développée complètement** : `User.countryOfResidence` / `preferredCurrency`,
  `Group.openToDiaspora`, `PaymentMethod` généralisé (Mobile Money / carte bancaire /
  virement, sans jamais stocker de PAN ou d'IBAN en clair — uniquement tokens et
  derniers chiffres), `LedgerTransaction.currency` / `amountXaf` / `fxRate` pour la
  conversion vers la devise pivot XAF. 3 nouveaux écrans créés (72-74, cf.
  `docs/screens-map.md`).
- **Sortie volontaire d'un membre en cours de cycle** : nouveau statut
  `GroupMember.exitStatus` (demande → validation admin). Si le tour du membre n'est
  pas encore passé, remboursement de ses cotisations versées ; s'il est déjà passé,
  règlement du solde dû (`outstandingDebt`) avant sortie effective. Voir
  `GroupsService.requestExit` / `decideExit`. 4 nouveaux écrans créés (75-78).
- **Retard de cotisation en cycle actif** : le versement au bénéficiaire du cycle
  n'est jamais bloqué par un retard ; la dette du membre en retard est tracée dans
  `GroupMember.outstandingDebt` et déduite automatiquement quand vient SON PROPRE
  tour (`Cycle.deductedAmount` / `paidOutAmount`, transaction `ARREARS_DEDUCTION`).

Points identifiés mais non traités à ce stade (hors périmètre des 3 décisions
ci-dessus, à trancher plus tard si besoin) : droit d'entrée/adhésion distinct de la
cotisation périodique, rôle de commissaire aux comptes/censeur (contre-pouvoir face
au caissier), mode "épargne pure" sans rotation.

## Reconstruction du projet — dépendances à jour (août 2026)

Toutes les dépendances ont été portées à leur dernière version **stable et
mutuellement compatible** (pas uniquement la version la plus récente qui
existe dans l'absolu — voir plus bas pourquoi ça compte) :

| Composant | Avant | Après |
|---|---|---|
| Expo SDK | 51 | **57** (versions natives alignées via `bundledNativeModules.json`, cf. note réseau ci-dessous) |
| React / React Native | 18.2 / 0.74 | **19.2.3 / 0.86.2** |
| NestJS | 10 | **11.2.3** |
| Prisma | 5.16 | **7.10.0** |
| class-validator | 0.14 | **0.15.1** |
| bcryptjs | 2.4 | **3.0.3** (`@types/bcryptjs` retiré — types désormais inclus nativement) |
| Jest / @types/jest | 29 | **30** |
| TypeScript | 5.4 | **6.0.3** |

**Pourquoi TypeScript 6.0.3 et pas 7.0 (la vraie "dernière version") ?**
`ts-jest` et `@typescript-eslint` exigent tous les deux `typescript < 7` au
moment de cette mise à jour. Installer TS 7 aurait cassé les tests et le
lint. 6.0.3 est donc la version la plus récente qui reste compatible avec
toute la chaîne d'outils — à revoir quand ces paquets publieront leur
support de TS 7.

**Modernisation de la configuration TypeScript induite par ce saut de
version** (les anciennes options sont dépréciées à partir de TS 6, avant
suppression en TS 7) :
- `moduleResolution: "node"` → `"node16"` (+ `module: "node16"` assorti,
  obligatoire) dans `tsconfig.base.json`.
- Suppression du `baseUrl` déprécié partout ; les valeurs de `paths` portent
  désormais un préfixe `./` explicite (résolues relativement au fichier où
  elles sont définies, comme l'exige TS ≥ 4.1 en l'absence de `baseUrl`).
- Ajout de `rootDir` explicite dans `apps/backend/tsconfig.json` (désormais
  obligatoire dès que `declaration` + `outDir` sont utilisés ensemble).

**Corrections de code liées aux breaking changes des nouvelles versions :**
- `@nestjs/jwt` 11 resserre le typage de `expiresIn` (accepte un littéral
  `"15m"`/`"30d"` ou un nombre, plus un `string` générique) — cast explicite
  ajouté dans `AuthService.issueTokens` puisque la valeur vient de
  variables d'environnement, non vérifiables statiquement.
- Deux paramètres en `any` implicite dans `LoansService.evaluateVotes`
  (`m`, `v` des `.filter()`) typés explicitement en `GroupMember` /
  `LoanVote`.

**Prisma 7 : changement d'architecture important (plus qu'un simple
numéro de version).** Prisma ORM 7 a retiré son moteur de requêtes Rust
au profit de `node-postgres`, et la configuration de connexion a bougé :
- `datasource.url` n'est **plus autorisé dans `schema.prisma`** — retiré
  du fichier.
- Nouveau fichier `apps/backend/prisma.config.ts` : c'est lui que lisent
  les commandes CLI (`generate`, `migrate`, `studio`) pour trouver
  `DATABASE_URL`.
- `PrismaService` doit maintenant instancier `PrismaClient` avec un
  adaptateur explicite (`@prisma/adapter-pg`, qui utilise le paquet `pg`)
  plutôt que de lire `DATABASE_URL` implicitement.
- Oui, `DATABASE_URL` est donc bien défini à deux endroits différents
  (`prisma.config.ts` pour le CLI, `PrismaService` pour l'application au
  runtime) — c'est le comportement documenté de Prisma 7, pas une
  erreur de configuration ; l'équipe Prisma a reconnu la redondance mais
  ne l'a pas encore supprimée à ce jour.
- Nouvelles dépendances ajoutées en conséquence : `@prisma/adapter-pg`,
  `pg`, `dotenv` (Prisma 7 ne charge plus automatiquement les `.env`).

**Limite connue de cet environnement (bac à sable) :** `npx prisma
generate` échoue ici car le domaine `binaries.prisma.sh` (téléchargement du
moteur de schéma) n'est pas joignable depuis ce sandbox. Ce n'est pas un
défaut du projet : sur votre machine ou en CI avec un accès réseau normal,
`npx prisma generate` s'exécute sans problème. Le backend a été vérifié
(`tsc --noEmit` + `nest build`, sans erreur) à l'aide d'un client Prisma
factice local non livré dans ce dépôt, le temps de la vérification, puis
supprimé — pensez à lancer `npx prisma generate` après `npm install` avant
de démarrer l'API.

De même, `expo install --fix` ne fonctionne pas ici (l'API `exp.host`
n'est pas joignable) ; les versions natives ont donc été alignées à la
main sur celles listées dans `node_modules/expo/bundledNativeModules.json`
pour le SDK 57. Un `npx expo install --check` chez vous confirmera que
tout est cohérent.



1. Créer dans la maquette (ou directement en React Native) les 7 écrans identifiés
   par l'audit (`docs/screens-map.md`), puis implémenter fidèlement chaque écran des
   71 + 7, en commençant par le parcours d'authentification et de KYC.
2. ✅ Hash du PIN (bcrypt) et vérification OTP réelle (code à 6 chiffres, hashé, expirant
   après 5 min, verrouillage anti brute-force) — fait. Reste à brancher un vrai fournisseur
   SMS (Twilio/Vonage/agrégateur local) : le code est pour l'instant journalisé côté serveur
   et renvoyé en clair uniquement hors production (`devCode`), pour permettre de tester le
   parcours sans SMS réel.
3. Intégrer l'agrégateur Mobile Money retenu (comparatif CinetPay / Maviance) ainsi
   qu'un PSP carte bancaire pour les paiements diaspora.
4. Implémenter le job périodique de détection des retards de cotisation
   (déclenchement de `ARREARS_DEDUCTION` à échéance).
5. Ajouter les tests (unitaires backend, tests E2E mobile).
