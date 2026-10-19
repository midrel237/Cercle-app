# Installation sous Windows — guide détaillé

> Contenu déplacé depuis le README principal. Pour le démarrage rapide,
> voir la section « Démarrage » du README.

## Prérequis

- **Node.js** : ce projet exige `^20.19.4`, `^22.13.0` ou `>=24.3.0`
  (intersection des exigences de `react-native@0.86`/Metro et de
  `prisma@7` — voir `package.json` → `engines`, vérifié automatiquement
  via `engine-strict=true` dans `.npmrc`). Node 22.11 ou 22.12 par
  exemple ne suffisent pas : il faut au moins 22.13 sur la branche 22.x.
  **Le plus simple reste Node 24 (24.3.0 ou plus récent, ex. 24.19)** :
  c'est la seule des trois plages sans limite haute connue. Vérifie avec
  `node -v`, et mets à jour si besoin (nvm-windows ou installeur
  officiel).
- **Ne travaille pas dans un dossier synchronisé par OneDrive** (le cas
  par défaut de `Downloads`, `Documents`, `Bureau` sur beaucoup de PC
  Windows pro/perso). OneDrive verrouille des fichiers pendant sa
  synchronisation, ce qui provoque des erreurs `ENOTEMPTY` / `EPERM`
  lors du `npm install` (React Native et Expo créent des milliers de
  petits fichiers). Déplace plutôt le projet dans un chemin court hors
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
  relance simplement `npm install`, npm reprend là où c'est resté. Si ça
  persiste, vérifie un éventuel proxy/VPN d'entreprise
  (`npm config get proxy`) et désactive temporairement l'antivirus en
  temps réel sur le dossier du projet.

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
   ou `Get-Service postgresql*` en PowerShell) ; il démarre
   automatiquement au boot par défaut.

Dans les deux cas, la suite (`npx prisma migrate dev`) est identique.
