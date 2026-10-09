# 📡 STARMAJ ATELIER

**Gestion Cloud MikroTik, Hotspot WiFi, Mikhmon Intégré & Automatisation IA**

Plateforme de gestion Cloud pour routeurs MikroTik, Hotspot WiFi, Mikhmon intégré, reconfiguration automatique et monnaie virtuelle StarCoin (SC).

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- PostgreSQL (local ou Alwaysdata)
- Un routeur MikroTik RouterOS v7+

### Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/amhmsagent1-beep/starmaj-atelier.git
cd starmaj-atelier

# 2. Installer les dépendances
npm install

# 3. Configurer la variable d'environnement DATABASE_URL
# (Voir section "Configuration" ci-dessous)

# 4. Importer le schéma SQL complet
psql -d votre_base -f src/db/schema.sql

# 5. Démarrer l'application
npm run dev
```

---

## 🔐 Compte Administrateur

| Champ | Valeur |
|-------|--------|
| **Téléphone** | `+22777514012` |
| **Mot de passe** | `StarMaj@7349` |
| **Rôle** | `admin` |
| **Solde initial** | 100 000 SC (= 5 000 000 FCFA) |
| **Plan** | `aventurier` (toutes options débloquées) |

---

## 📦 Schéma SQL Complet (Import Unique)

Le fichier `src/db/schema.sql` contient **tout** le schéma de base de données :

- **12 tables** avec contraintes d'intégrité référentielle
- **Compte administrateur** : `+22777514012` / `StarMaj@7349`
- **5 passerelles de paiement** (Airtel Money, Moov Flooz, Alza, Zamani Cash, Wave)
- **3 modèles de portails captifs** prêts à l'emploi
- **4 profils Mikhmon** par défaut (1H Express, 3H Standard, Journée, Semaine VIP)
- **Parité** : 50 FCFA = 1 StarCoin (SC)

### Importer le schéma

```bash
# Avec psql
psql -h h.votre-base.alwaysdata.com -U votre_utilisateur -d nom_base -f src/db/schema.sql

# Ou via pgAdmin / phpMyAdmin
# 1. Ouvrir pgAdmin
# 2. Connecter à votre base PostgreSQL
# 3. Ouvrir la console SQL
# 4. Coller le contenu de src/db/schema.sql
# 5. Exécuter (F5)
```

---

## ⚙️ Configuration

### Variable d'environnement (`.env`)

```env
# Base de données PostgreSQL (Alwaysdata ou local)
DATABASE_URL=postgres://votre_utilisateur:votre_mot_de_passe@h.votre-base.alwaysdata.com:41517/nom_base

# (Optionnel) Clé JWT pour les sessions
JWT_SECRET=votre_cle_secrete_aleatoire_32_caracteres_min
```

### Configuration SSL pour Vercel + Alwaysdata

Alwaysdata **exige** une connexion SSL. Vercel peut ne pas faire confiance à la chaîne de certificats d'Alwaysdata. Pour forcer le SSL avec vérification relâchée :

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Set the DATABASE_URL environment variable.");
}

const globalForDb = globalThis as typeof globalThis & {
  __starmajPostgresqlPool?: Pool;
};

// Forcer SSL avec vérification relâchée (Vercel + Alwaysdata)
let connectionString = databaseUrl;
try {
  const parsed = new URL(databaseUrl);
  parsed.searchParams.delete("sslmode"); // Retirer sslmode pour que ssl: prenne le pas
  connectionString = parsed.toString();
} catch {
  connectionString = databaseUrl;
}

const pool =
  globalForDb.__starmajPostgresqlPool ??
  new Pool({
    connectionString,
    // Forcer SSL avec vérification relâchée (Vercel + Alwaysdata)
    ssl: { rejectUnauthorized: false },
    // Échec rapide au lieu de hang (timeout Vercel)
    connectionTimeoutMillis: 15000,
    // Vercel Functions: exit quand idle
    allowExitOnIdle: true,
    // Connexion chaude entre les invocations
    keepAlive: true,
    // Limiter les connexions concurrentes
    max: 10,
    idleTimeoutMillis: 30000,
  });

globalForDb.__starmajPostgresqlPool = pool;

export { pool };
export const db = drizzle(pool);
```

### Déploiement sur Vercel

1. Connecter votre dépôt GitHub à Vercel
2. Ajouter la variable d'environnement `DATABASE_URL` :
   ```
   DATABASE_URL=postgres://votre_utilisateur:votre_mot_de_passe@h.votre-base.alwaysdata.com:41517/nom_base
   ```
3. Vercel détectera automatiquement le projet Next.js et le déploiera
4. La connexion SSL est forcée avec `rejectUnauthorized: false` dans `src/db/index.ts`

---

## 📋 Fonctionnalités

### 1. Module Mikhmon Léger Intégré
- **Générateur Industriel de Coupons** : lots de 20, 50, 100, 250, 500 tickets
- **Modèles d'Impression** : 50 coupons/page A4, 40 coupons/page A4, 18 coupons/page A4, rouleau thermique 58mm/80mm
- **Suivi des Ventes en Temps Réel** : chiffre d'affaires jour/semaine/mois
- **Profils Mikhmon** : limitation de débit (upload/download), durée, prix

### 2. Portails Captifs Personnalisables (4 Pages)
- **Page 1 - Connexion** : formulaire de connexion Hotspot MikroTik
- **Page 2 - Conditions Générales** : conditions d'accès modifiables
- **Page 3 - Politique d'Utilisation** : politique de sécurité modifiable
- **Page 4 - Contact & Assistance** : numéro de téléphone, moyens de paiement

### 3. Configuration Automatique (Zero-Touch)
- **Reconfiguration DNS** : modifier les DNS du routeur sans copier de script
- **Portail Captif** : assigner un modèle de portail au routeur sans copier de script
- **Initialisation Hotspot IA** : création automatique du Bridge, DHCP, DNS, Hotspot, Walled Garden

### 4. Module d'Optimisation Réseau
- **Agrégation PCC** : agrégation de 2 à 8 lignes internet simultanées
- **VPN Haute Dispo** : tunnel de secours WireGuard/SSTP
- **Multi-Marques** : contrôle des bornes Ubiquiti, Ruijie, Grandstream

### 5. Roaming Multi-Zones & Anti-Fraude
- **Roaming Multi-Zones** : un ticket créé sur le routeur A est utilisable sur le routeur B de la même zone
- **Anti-Fraude Stricte** : 1 seul appareil MAC par ticket (shared-users=1)

### 6. Fintech & Monnaie Virtuelle StarCoin (SC)
- **Parité** : 50 FCFA = 1 StarCoin (SC)
- **5 Passerelles de Paiement** : Airtel Money, Moov Flooz, Alza, Zamani Cash, Wave
- **Validation Manuelle** : validation manuelle des dépôts par l'administrateur

---

##  Structure du Projet

```
starmaj-atelier/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── session/
│   │   │   │       └── route.ts          # Authentification (login/register/logout)
│   │   │   ├── heartbeat/
│   │   │   │   ├── route.ts              # Endpoint /heartbeat (RouterOS /tool fetch)
│   │   │   │   └── logs/
│   │   │   │       └── route.ts          # Journal des heartbeats
│   │   │   ├── routers/
│   │   │   │   └── route.ts              # CRUD Routeurs MikroTik
│   │   │   ├── mikhmon/
│   │   │   │   ├── batches/
│   │   │   │   │   └── route.ts          # CRUD Lots de Coupons
│   │   │   │   ├── tickets/
│   │   │   │   │   └── route.ts          # CRUD Tickets WiFi
│   │   │   │   ├── profiles/
│   │   │   │   │   └── route.ts          # CRUD Profils Mikhmon
│   │   │   │   └── stats/
│   │   │   │       └── route.ts          # Statistiques des ventes
│   │   │   ├── gateways/
│   │   │   │   └── route.ts              # CRUD Passerelles de Paiement
│   │   │   ├── captive-portal/
│   │   │   │   └── route.ts              # CRUD Portails Captifs
│   │   │   ├── transactions/
│   │   │   │   └── route.ts              # CRUD Transactions
│   │   │   ├── plans/
│   │   │   │   └── subscribe/
│   │   │   │       └── route.ts          # Souscription aux plans
│   │   │   ├── generator/
│   │   │   │   └── route.ts              # Générateur PCC & VPN
│   │   │   ├── schema-sql/
│   │   │   │   └── route.ts              # API du schéma SQL
│   │   │   ├── seed/
│   │   │   │   └── route.ts              # Seed initial
│   │   │   ├── health/
│   │   │   │   └── route.ts              # Healthcheck
│   │   │   ├── validation/
│   │   │   │   └── route.ts              # Validation des dépôts (Admin)
│   │   │   ├── users/
│   │   │   │   └── route.ts              # CRUD Users
│   │   │   ├── devices/
│   │   │   │   └── route.ts              # CRUD Équipements Tiers
│   │   │   └── roaming/
│   │   │       └── route.ts              # CRUD Zones de Roaming
│   │   ├── components/
│   │   │   ├── LandingAuth.tsx           # Page d'accueil + Login/Register
│   │   │   ├── Navbar.tsx                # Navigation
│   │   │   ├── DashboardOverview.tsx     # Aperçu Global
│   │   │   ├── RoutersManager.tsx        # Gestion des Routeurs
│   │   │   ├── MikhmonStudio.tsx         # Module Mikhmon
│   │   │   ├── OptimizationOpTiNet.tsx   # Optimisation Réseau
│   │   │   ├── FintechWallets.tsx        # Fintech & Paiements
│   │   │   ├── RoamingAntiFraud.tsx      # Roaming & Anti-Fraude
│   │   │   ├── PlansBilling.tsx          # Plans & Tarifs
│   │   │   └── DeliverablesCode.tsx      # Code & Livrables
│   │   ├── admin/
│   │   │   └── page.tsx                  # Admin Dashboard
│   │   ├── db/
│   │   │   ├── index.ts                  # Connexion PostgreSQL (SSL)
│   │   │   ├── schema.ts                 # Schéma Drizzle ORM
│   │   │   └── schema.sql                # Schéma SQL complet (import unique)
│   │   ├── lib/
│   │   │   ├── auth.ts                   # Authentification (JWT)
│   │   │   └── pricing.ts                # Tarification & Chiffrement
│   │   ├── app/
│   │   │   ├── page.tsx                  # Page principale
│   │   │   ├── layout.tsx                # Layout global
│   │   │   └── globals.css               # Styles globaux
│   │   └── types/
│   │       └── index.ts                  # Types TypeScript
│   └── db/
│       ├── index.ts                      # Connexion PostgreSQL (SSL)
│       ├── schema.ts                     # Schéma Drizzle ORM
│       ├── schema.sql                    # Schéma SQL complet (import unique)
│       ├── seed.ts                       # Seed initial
│       └── init.sql                      # Seed initial (alternative)
├── public/
│   └── fastapi_heartbeat.py              # API Backend Python/FastAPI
├── src/
│   └── db/
│       └── schema.sql                    # Schéma SQL complet (import unique)
├── .env                                  # Variables d'environnement
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

---

## 🔑 Compte Administrateur

| Champ | Valeur |
|-------|--------|
| **Téléphone** | `+22777514012` |
| **Mot de passe** | `StarMaj@7349` |
| **Rôle** | `admin` |
| **Solde initial** | 100 000 SC (= 5 000 000 FCFA) |
| **Plan** | `aventurier` (toutes options débloquées) |

---

## 📖 Documentation Technique

### 1. Schéma SQL Complet

Le fichier `src/db/schema.sql` contient le schéma complet de la base de données PostgreSQL avec :
- 12 tables avec contraintes d'intégrité référentielle
- Compte administrateur : `+22777514012` / `StarMaj@7349`
- 5 passerelles de paiement (Airtel Money, Moov Flooz, Alza, Zamani Cash, Wave)
- 3 modèles de portails captifs prêts à l'emploi
- 4 profils Mikhmon par défaut
- Parité : 50 FCFA = 1 StarCoin (SC)

### 2. API Backend Python / FastAPI

Le fichier `public/fastapi_heartbeat.py` contient l'API Backend Python/FastAPI :
- Endpoint `/heartbeat` pour les appels RouterOS `/tool fetch`
- Module Mikhmon Léger (génération de lots, profils, statistiques)
- Reconfiguration automatique des DNS et portails captifs
- Auto-réparation IA (surcharge CPU, panne DNS, interface down)

### 3. Script MikroTik RouterOS

Le script MikroTik RouterOS est généré dynamiquement par l'application. Il contient :
- La commande `/tool fetch` pour le polling inversé
- La commande `[:parse]` pour l'exécution en RAM
- Le planificateur Scheduler pour le polling automatique
- La reconfiguration automatique des DNS et portails captifs

---

## 🚀 Déploiement sur Vercel

### Étapes

1. **Connecter votre dépôt GitHub à Vercel**
   - Aller sur [Vercel.com](https://vercel.com)
   - Cliquer sur "Add New Project"
   - Sélectionner votre dépôt GitHub
   - Vercel détectera automatiquement le projet Next.js

2. **Configurer les variables d'environnement**
   - Aller dans "Project Settings" > "Environment Variables"
   - Ajouter :
     ```
     DATABASE_URL=postgres://votre_utilisateur:votre_mot_de_passe@h.votre-base.alwaysdata.com:41517/nom_base
     ```

3. **Importer le schéma SQL**
   - Ouvrir pgAdmin ou la console SQL d'Alwaysdata
   - Coller le contenu de `src/db/schema.sql`
   - Exécuter (F5)

4. **Déployer**
   - Vercel déploiera automatiquement le projet
   - La connexion SSL est forcée avec `rejectUnauthorized: false` dans `src/db/index.ts`

---

## 📝 Notes Techniques

### Parité Monétaire
- **50 FCFA (XOF) = 1 StarCoin (SC)**
- 100 CFA = 2 SC
- 250 CFA = 5 SC
- 500 CFA = 10 SC
- 1000 CFA = 20 SC
- 5000 CFA = 100 SC

### Compte Administrateur
- **Téléphone** : `+22777514012`
- **Mot de passe** : `StarMaj@7349`
- **Rôle** : `admin`
- **Solde initial** : 100 000 SC (= 5 000 000 FCFA)
- **Plan** : `aventurier` (toutes options débloquées)

### Configuration SSL (Vercel + Alwaysdata)
Alwaysdata exige une connexion SSL. Vercel peut ne pas faire confiance à la chaîne de certificats d'Alwaysdata. Pour forcer le SSL avec vérification relâchée :

```typescript
// src/db/index.ts
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }, // Forcer SSL, vérif. relâchée
  connectionTimeoutMillis: 15000,
  allowExitOnIdle: true,
  keepAlive: true,
  max: 10,
  idleTimeoutMillis: 30000,
});
```

---

## 📄 Licence

Propriétaire - StarMaj Atelier
