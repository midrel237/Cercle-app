# Cercle — Plateforme de tontine digitalisée (Njangi)

Monorepo du MVP (Expo + NestJS + PostgreSQL/Prisma), conforme au *Cahier des
charges Tontine App* et à la maquette `Cercle_maquettes_ecrans.html` (80 écrans).

## Stack

| Composant | Choix |
|---|---|
| Mobile | React Native + Expo 57, Expo Router |
| Backend | NestJS 11, API REST |
| BDD | PostgreSQL (Prisma 7, adaptateur pg) |
| KYC | Didit eKYC (flux hébergé + webhook signé) |
| Mobile Money | Agrégateur (CinetPay/Maviance) |
| Notifications | In-app + cron @nestjs/schedule (Expo Push/SMS à brancher) |
| Relevés PDF | Générateur TypeScript pur (node:zlib) — module statements |
| SMS | Termii (SmsProvider, console en dev) |
| Auth | JWT + Secure Store + biométrie + OTP SMS |

## Documentation

- Installation Windows (Node, OneDrive, chemins longs, PostgreSQL) :
  docs/installation-windows.md
- Migration des dépendances (Expo 57, NestJS 11, Prisma 7, TS 6.0.3) :
  docs/dev-notes-dependances-2026-08.md
- Cartographie des 80 écrans : docs/screens-map.md

## Démarrage

```bash
npm install
cp .env.example apps/backend/.env   # DATABASE_URL, secrets JWT, SMS_PROVIDER, DIDIT_*
npx prisma generate                # backend (Prisma 7 ne charge plus les .env)

npm run backend:migrate             # schéma Prisma -> PostgreSQL
npm run backend                     # API sur http://localhost:3000/api/v1
npm run mobile                      # Expo (autre terminal)
```

## État actuel (19 octobre 2026)

- ✅ Modules backend : auth, users, kyc (Didit), groups, transactions
  (ledger), statements (PDF), loans, events, payments, notifications
  (cron retards), common/sms.
- ✅ **Cron des retards de cotisation (PR #24)** : EVERY_HOUR
  handleLateContributions() — alerte LATE_PAYMENT_ALERT des membres actifs
  non-payeurs, anti-doublon par cycle, i18n FR/EN.
- ✅ **Relevé PDF de groupe (PR #27, écran 69)** : générateur TS pur (PDF
  1.4, pagination auto) ; GET /statements/group/:id.pdf (garde : membre du
  groupe) ; mobile : ouverture via expo-web-browser avec JWT en query param
  (stratégie jwt-query dédiée, TTL 15 min).
- ✅ **CI GitHub Actions** : backend (lint, build, **30 tests**) + mobile
  (lint, tsc) — 100 % verte sur main.
- ✅ Mobile : écrans 1-7, 13-15, 23-26, 67-70, 72-73, 79-80 implémentés ;
  KYC 8-12 délégués au flux Didit ; reste en placeholder (screens-map).
- ✅ Endpoints mobiles typés en miroir du backend (PR #21).

## Étapes suivantes

1. Écrans restants : onboarding (16-20), vie du groupe (27-53), prêts (57-66).
2. Identifiants prod Termii / Didit.
3. Agrégateur Mobile Money réel + PSP carte diaspora.
4. Règle trustScore (dégradation, plancher, récupération) — socle prêt.
5. Expo Push dans dispatch() — stockage du token par utilisateur.
6. Durcissement autorisations — généraliser la garde d'appartenance.

## Maintenance connue

- 3 stubs à git rm au prochain passage local :
  apps/backend/src/transactions/statements.service.ts, .controller.ts,
  .service.spec.ts — doublons neutralisés d'une implémentation PDF
  abandonnée (consigne dans chaque fichier, aucun module ne les référence).
- Rendu visuel du PDF à valider depuis l'app en local avant prod.
