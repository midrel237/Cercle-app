# Correspondance maquette → routes Expo Router

Chaque ligne correspond à un écran de `Cercle_maquettes_ecrans.html`.
Réorganisé pour suivre l'ordre réel du parcours utilisateur (voir
« Réorganisation des écrans » dans le cahier des charges pour le détail
des déplacements et le raisonnement).

## DÉCOUVERTE

| # | Écran (maquette) | Route |
|---|---|---|
| 1 | Splash | `(auth)/splash` |
| 2 | Language Selection | `(auth)/language` |
| 3 | Welcome Carousel | `(auth)/welcome` |

## INSCRIPTION & SÉCURITÉ

| # | Écran (maquette) | Route |
|---|---|---|
| 4 | Login | `(auth)/login` |
| 5 | OTP Verification | `(auth)/otp` |
| 6 | KYC Intro | `(kyc)/intro` |
| 7 | KYC Document Choice | `(kyc)/document-choice` |
| 8 | KYC Capture Recto | `(kyc)/capture-recto` |
| 9 | KYC Capture Verso | `(kyc)/capture-verso` |
| 10 | KYC Review Docs | `(kyc)/review-docs` |
| 11 | KYC Selfie | `(kyc)/selfie` |
| 12 | KYC Infos | `(kyc)/infos` |
| 13 | KYC Processing | `(kyc)/processing` |
| 14 | KYC Success | `(kyc)/success` |
| 15 | KYC Rejected | `(kyc)/rejected` |
| 16 | Create PIN | `(onboarding)/create-pin` |
| 17 | PIN Confirm | `(onboarding)/pin-confirm` |
| 18 | Biometric Setup | `(onboarding)/biometric-setup` |
| 19 | Notification Permission | `(onboarding)/notification-permission` |
| 20 | Security | `(onboarding)/security` |

## PREMIER ACCÈS

| # | Écran (maquette) | Route |
|---|---|---|
| 21 | Empty State | état interne de `(tabs)/index` |
| 22 | Home | `(tabs)/index` |

## CRÉER / REJOINDRE UN GROUPE

| # | Écran (maquette) | Route |
|---|---|---|
| 23 | Create Group (step 1) | `group/create/step-1` |
| 24 | Create Group (step 2) | `group/create/step-2` |
| 25 | Create Group (step 3) | `group/create/step-3` |
| 26 | Group Rules (admin) | `group/create/rules` |
| 27 | Join Group | `group/join` |
| 28 | Join Request Pending | `group/join-pending` |
| 29 | Draw Order | `group/[id]/draw-order` |
| 30 | Draw Order Result | `group/[id]/draw-result` |

## VIE QUOTIDIENNE DU GROUPE

| # | Écran (maquette) | Route |
|---|---|---|
| 31 | Group Detail | `group/[id]/index` |
| 32 | Mobile Money PIN Prompt | `payment/pin-prompt` |
| 33 | Payment Processing | `payment/processing` |
| 34 | Payment Methods | `payment/methods` |
| 35 | Add Payment Method | `payment/add-method` |
| 36 | Add Bank Card 🌍 | `payment/add-card` |
| 37 | Add Bank Transfer 🌍 | `payment/add-bank-transfer` |
| 38 | Mobile Money Payment | `payment/mobile-money` |
| 39 | Payment Failed | `payment/failed` |
| 40 | Receipt | `payment/receipt` |
| 41 | Group Discussion / Chat | `group/[id]/chat` |

## MEMBRES & ADMINISTRATION

| # | Écran (maquette) | Route |
|---|---|---|
| 42 | Members List (admin) | `group/[id]/members` |
| 43 | Add Member (admin) | `group/[id]/add-member` |
| 44 | Member Actions (admin) | `group/[id]/member-actions` |
| 45 | Remove Member Confirm | `group/[id]/remove-member-confirm` |
| 46 | Member Profile | `group/[id]/member/[memberId]` |
| 47 | Manual Reminder | `group/[id]/manual-reminder` |
| 48 | Assign Cashier (admin) | `group/[id]/assign-cashier` |
| 49 | Deposit Account (cashier) | `group/[id]/deposit-account` |
| 50 | Request Group Exit 🚪 | `group/[id]/exit-request` |
| 51 | Exit Request Pending 🚪 | `group/[id]/exit-pending` |
| 52 | Exit Requests (admin) 🚪 | `group/[id]/exit-requests` |
| 53 | Exit Settlement 🚪 | `group/[id]/exit-settlement` |

## ÉVÉNEMENTS COMMUNAUTAIRES

| # | Écran (maquette) | Route |
|---|---|---|
| 54 | Group Events | `group/[id]/events` |
| 55 | Create Event | `group/[id]/events/create` |
| 56 | Contribute to Event | `group/[id]/events/[eventId]/contribute` |

## PRÊTS INTERNES

| # | Écran (maquette) | Route |
|---|---|---|
| 57 | Loans Overview | `(tabs)/loans` |
| 58 | Loan Request | `loan/request` |
| 59 | Loan Vote | `loan/[id]/vote` |
| 60 | Loan Approved | `loan/approved` |
| 61 | Loan Rejected | `loan/rejected` |
| 62 | Electronic Signature | `loan/signature` |
| 63 | Contract | `loan/[id]/contract` |
| 64 | Loan Detail | `loan/[id]/index` |
| 65 | Make Repayment | `loan/[id]/repay` |
| 66 | Repayment Confirmed | `loan/repayment-confirmed` |

## SUIVI & TRAÇABILITÉ

| # | Écran (maquette) | Route |
|---|---|---|
| 67 | History | `(tabs)/history` |
| 68 | Transaction Detail | `transaction/[id]` |
| 69 | Statement Export | `statement-export` |
| 70 | Notifications | `notifications` |
| 71 | Cycle Completed | `group/[id]/cycle-completed` |

## PROFIL & PARAMÈTRES

| # | Écran (maquette) | Route |
|---|---|---|
| 72 | Profile | `(tabs)/profile` |
| 73 | Edit Profile | `settings/edit-profile` |
| 74 | Settings | `settings/index` |
| 75 | Currency & Country Settings 🌍 | `settings/region` |
| 76 | Logout Confirm | `settings/logout-confirm` |
| 77 | Help & Support | `settings/help` |
| 78 | Support Chat | `settings/support-chat` |

## INSCRIPTION & SÉCURITÉ (complément)

| # | Écran (maquette) | Route |
|---|---|---|
| 79 | Country / Dial Code Picker | `(auth)/country-picker` |
| 80 | Create Account | `(auth)/create-account` |

Écrans marqués 🌍 (diaspora) et 🚪 (sortie de groupe) : intégrés directement dans la section fonctionnelle où ils interviennent dans le parcours, plutôt que regroupés à part en fin de document (voir cahier des charges).
