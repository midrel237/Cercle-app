# Reconstruction du projet — dépendances à jour (août 2026)

> Notes techniques déplacées depuis le README principal pour l'alléger.
> Le contexte d'installation (Node, PostgreSQL, OneDrive, chemins longs) reste dans le README.

Toutes les dépendances ont été portées à leur dernière version **stable et
mutuellement compatible** (pas uniquement la version la plus récente qui
existe dans l'absolu) :

| Composant | Avant | Après |
|---|---|---|
| Expo SDK | 51 | **57** (versions natives alignées via `bundledNativeModules.json`) |
| React / React Native | 18.2 / 0.74 | **19.2.3 / 0.86.2** |
| NestJS | 10 | **11.2.3** |
| Prisma | 5.16 | **7.10.0** |
| class-validator | 0.14 | **0.15.1** |
| bcryptjs | 2.4 | **3.0.3** (`@types/bcryptjs` retiré — types inclus nativement) |
| Jest / @types/jest | 29 | **30** |
| TypeScript | 5.4 | **6.0.3** |

## Pourquoi TypeScript 6.0.3 et pas 7.0 ?

`ts-jest` et `@typescript-eslint` exigent tous les deux `typescript < 7` au
moment de cette mise à jour. Installer TS 7 aurait cassé les tests et le
lint. 6.0.3 est donc la version la plus récente qui reste compatible avec
toute la chaîne d'outils — à revoir quand ces paquets publieront leur
support de TS 7.

## Modernisation de la configuration TypeScript

(les anciennes options sont dépréciées à partir de TS 6, avant suppression
en TS 7) :

- `moduleResolution: "node"` → `"node16"` (+ `module: "node16"` assorti,
  obligatoire) dans `tsconfig.base.json`.
- Suppression du `baseUrl` déprécié partout ; les valeurs de `paths` portent
  désormais un préfixe `./` explicite.
- Ajout de `rootDir` explicite dans `apps/backend/tsconfig.json` (désormais
  obligatoire dès que `declaration` + `outDir` sont utilisés ensemble).

## Corrections de code liées aux breaking changes

- `@nestjs/jwt` 11 resserre le typage de `expiresIn` (accepte un littéral
  `"15m"`/`"30d"` ou un nombre, plus un `string` générique) — cast explicite
  ajouté dans `AuthService.issueTokens` puisque la valeur vient de
  variables d'environnement.
- Deux paramètres en `any` implicite dans `LoansService.evaluateVotes`
  typés explicitement en `GroupMember` / `LoanVote`.

## Prisma 7 : changement d'architecture important

Prisma ORM 7 a retiré son moteur de requêtes Rust au profit de
`node-postgres`, et la configuration de connexion a bougé :

- `datasource.url` n'est **plus autorisé dans `schema.prisma`** — retiré
  du fichier.
- Nouveau fichier `apps/backend/prisma.config.ts` : c'est lui que lisent
  les commandes CLI (`generate`, `migrate`, `studio`) pour trouver
  `DATABASE_URL`.
- `PrismaService` instancie `PrismaClient` avec un adaptateur explicite
  (`@prisma/adapter-pg`, paquet `pg`) plutôt que de lire `DATABASE_URL`
  implicitement.
- `DATABASE_URL` est donc défini à deux endroits différents
  (`prisma.config.ts` pour le CLI, `PrismaService` pour le runtime) —
  comportement documenté de Prisma 7, redondance reconnue mais non
  supprimée par l'équipe Prisma à ce jour.
- Nouvelles dépendances : `@prisma/adapter-pg`, `pg`, `dotenv`
  (Prisma 7 ne charge plus automatiquement les `.env`).

## Notes environnement bac à sable

`npx prisma generate` échouait dans le sandbox d'origine (domaine
`binaries.prisma.sh` non joignable). Sur machine normale ou en CI, il
s'exécute sans problème — pensez à le lancer après `npm install` avant de
démarrer l'API.

De même, `expo install --fix` n'était pas joignable depuis le sandbox ;
les versions natives ont été alignées à la main sur
`node_modules/expo/bundledNativeModules.json` (SDK 57). Un
`npx expo install --check` confirme que tout est cohérent.
