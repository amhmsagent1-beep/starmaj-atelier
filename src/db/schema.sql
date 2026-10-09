-- ==============================================================================
-- STARMAJ ATELIER - SCHÉMA COMPLET BASE DE DONNÉES POSTGRESQL (IMPORT UNIQUE)
-- Parité Monétaire : 50 Francs CFA (XOF) = 1 StarCoin (SC)
-- Compte Admin : +22777514012 / StarMaj@7349
-- ==============================================================================

-- ============================================================================
-- TABLES (CREATE TABLE IF NOT EXISTS pour import idempotent)
-- ============================================================================

-- 1. Table Utilisateurs (Authentification par téléphone, email facultatif)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    telephone VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    mot_de_passe VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    pays VARCHAR(100) DEFAULT 'Niger',
    solde_starcoin NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    plan_actuel VARCHAR(50) DEFAULT 'aucun',
    plan_expire_a TIMESTAMP,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Table Paramètres Système
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    cle_configuration VARCHAR(100) NOT NULL UNIQUE,
    valeur_configuration TEXT NOT NULL,
    description TEXT,
    modifie_par INTEGER REFERENCES users(id) ON DELETE SET NULL,
    mis_a_jour_a TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Table Passerelles de Paiement Fintech Niger
CREATE TABLE IF NOT EXISTS payment_gateways (
    id SERIAL PRIMARY KEY,
    nom_methode VARCHAR(100) NOT NULL UNIQUE,
    numero_telephone_defaut VARCHAR(100) NOT NULL,
    nom_beneficiaire VARCHAR(150) NOT NULL,
    instructions TEXT,
    statut VARCHAR(20) NOT NULL DEFAULT 'actif',
    frais_pourcentage NUMERIC(5,2) DEFAULT 0.00,
    pays VARCHAR(50) DEFAULT 'Niger',
    logo_icon VARCHAR(50) DEFAULT 'wallet',
    mis_a_jour_a TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Table Zones de Roaming Multi-Hotspots
CREATE TABLE IF NOT EXISTS roaming_zones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nom_zone VARCHAR(100) NOT NULL,
    description TEXT,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Table Modèles de Portails Captifs Personnalisables
CREATE TABLE IF NOT EXISTS captive_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    titre VARCHAR(150) NOT NULL,
    theme_couleur VARCHAR(50) DEFAULT 'amber_dark',
    nom_etablissement VARCHAR(150) DEFAULT 'STARMAJ HOTSPOT ZONE',
    message_bienvenue TEXT DEFAULT 'Bienvenue sur notre réseau WiFi Haute Vitesse ! Connectez-vous avec votre coupon.',
    contact_assistance VARCHAR(100) DEFAULT '+227 90 00 11 22',
    logo_text VARCHAR(100) DEFAULT 'STARMAJ WIFI',
    tarifs_affichage TEXT DEFAULT '1H = 100 CFA (2 SC) | 3H = 250 CFA (5 SC) | 24H = 500 CFA (10 SC)',
    afficher_popup_statut BOOLEAN DEFAULT true,
    html_complet TEXT,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. Table Routeurs MikroTik (Communication /tool fetch)
CREATE TABLE IF NOT EXISTS routers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roaming_zone_id INTEGER REFERENCES roaming_zones(id) ON DELETE SET NULL,
    captive_template_id INTEGER REFERENCES captive_templates(id) ON DELETE SET NULL,
    nom_routeur VARCHAR(150) NOT NULL,
    identifiant_unique_token VARCHAR(100) NOT NULL UNIQUE,
    version_routeros VARCHAR(50) DEFAULT 'v7.14',
    statut_connexion VARCHAR(50) DEFAULT 'hors_ligne',
    ip_publique VARCHAR(64),
    ip_locale VARCHAR(64) DEFAULT '192.168.88.1',
    dns_primaire VARCHAR(64) DEFAULT '1.1.1.1',
    dns_secondaire VARCHAR(64) DEFAULT '8.8.8.8',
    dns_nom_domaine VARCHAR(100) DEFAULT 'starmaj.hotspot',
    hotspot_interface VARCHAR(64) DEFAULT 'bridge-hotspot',
    modele VARCHAR(100) DEFAULT 'MikroTik RouterBOARD',
    cpu_load INTEGER DEFAULT 0,
    ram_free_mb INTEGER DEFAULT 128,
    uptime VARCHAR(50) DEFAULT '0d 0h 0m',
    active_hotspot_users INTEGER DEFAULT 0,
    derniere_synchro TIMESTAMP,
    auto_repair_enabled BOOLEAN DEFAULT true,
    pcc_enabled BOOLEAN DEFAULT false,
    pcc_lines_count INTEGER DEFAULT 2,
    script_pending TEXT,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 7. Table Profils Utilisateurs Mikhmon (Limites Débit, Temps, Prix)
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nom_profil VARCHAR(100) NOT NULL,
    vitesse_upload VARCHAR(50) DEFAULT '1M',
    vitesse_download VARCHAR(50) DEFAULT '2M',
    limite_temps VARCHAR(50) DEFAULT '1h',
    duree_validite VARCHAR(50) DEFAULT '24h',
    prix_cfa NUMERIC(10,2) DEFAULT 100.00,
    prix_sc NUMERIC(10,2) DEFAULT 2.00,
    shared_users INTEGER DEFAULT 1,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8. Table Lots Industriels de Coupons Mikhmon
CREATE TABLE IF NOT EXISTS ticket_batches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    router_id INTEGER REFERENCES routers(id) ON DELETE SET NULL,
    profile_id INTEGER REFERENCES user_profiles(id) ON DELETE SET NULL,
    nom_lot VARCHAR(150) NOT NULL,
    quantite INTEGER DEFAULT 50,
    template_design VARCHAR(50) DEFAULT 'mikhmon_thermal',
    logo_ticket VARCHAR(150) DEFAULT 'STARMAJ WIFI',
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 9. Table Tickets WiFi Hotspot (Coupons imprimables & MAC Binding)
CREATE TABLE IF NOT EXISTS wifi_tickets (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES ticket_batches(id) ON DELETE CASCADE,
    router_id INTEGER REFERENCES routers(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_ticket VARCHAR(50) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(50),
    profil_vitesse VARCHAR(50) DEFAULT '1M/2M',
    duree_validite VARCHAR(50) DEFAULT '1h',
    prix_cfa NUMERIC(10,2) DEFAULT 100.00,
    prix_sc NUMERIC(10,2) DEFAULT 2.00,
    est_actif BOOLEAN DEFAULT true,
    est_utilise BOOLEAN DEFAULT false,
    session_active_mac VARCHAR(50),
    derniere_ip VARCHAR(64),
    date_utilisation TIMESTAMP,
    date_expiration TIMESTAMP,
    roaming_enabled BOOLEAN DEFAULT true,
    logo_ticket VARCHAR(150) DEFAULT 'STARMAJ WIFI',
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 10. Table Transactions Financières (Recharges Mobile Money & Souscriptions)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    montant_sc NUMERIC(10,2) NOT NULL,
    montant_cfa NUMERIC(10,2) NOT NULL,
    methode_paiement VARCHAR(100),
    numero_expediteur VARCHAR(100),
    capture_ecran_url TEXT,
    statut VARCHAR(50) NOT NULL DEFAULT 'en_attente',
    reference_manuelle VARCHAR(150),
    commentaire_admin TEXT,
    valide_par INTEGER REFERENCES users(id) ON DELETE SET NULL,
    date_transaction TIMESTAMP NOT NULL DEFAULT NOW(),
    date_traitement TIMESTAMP
);

-- 11. Table Journal Heartbeat RouterOS /tool fetch
CREATE TABLE IF NOT EXISTS router_heartbeat_logs (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    token VARCHAR(100),
    ip_client VARCHAR(64),
    cpu_load INTEGER,
    uptime VARCHAR(50),
    action_prise VARCHAR(100),
    commandes_repondues TEXT,
    statut_alerte VARCHAR(50) DEFAULT 'normal',
    date_log TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 12. Table Points d'Accès Tiers Multi-Marques (Ubiquiti, Ruijie, Grandstream)
CREATE TABLE IF NOT EXISTS third_party_devices (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marque VARCHAR(50) NOT NULL,
    nom_appareil VARCHAR(100) NOT NULL,
    adresse_ip VARCHAR(64) NOT NULL,
    adresse_mac VARCHAR(50),
    vlan_id INTEGER DEFAULT 10,
    statut VARCHAR(50) DEFAULT 'en_ligne',
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- INDEXATION OPTIMISÉE
CREATE INDEX IF NOT EXISTS idx_routers_token ON routers(identifiant_unique_token);
CREATE INDEX IF NOT EXISTS idx_wifi_tickets_code ON wifi_tickets(code_ticket);
CREATE INDEX IF NOT EXISTS idx_wifi_tickets_user ON wifi_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(statut);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(telephone);

-- ============================================================================
-- COMPTE ADMINISTRATEUR PRINCIPAL
-- Téléphone : +22777514012
-- Mot de passe : StarMaj@7349
-- Solde initial : 100 000 SC (= 5 000 000 FCFA)
-- Plan : aventurier (toutes options débloquées)
-- ============================================================================
INSERT INTO users (nom, telephone, email, mot_de_passe, role, pays, solde_starcoin, plan_actuel)
VALUES (
    'Administrateur Principal StarMaj',
    '+22777514012',
    'admin@starmaj.atelier',
    'StarMaj@7349',
    'admin',
    'Niger',
    100000.00,
    'aventurier'
)
ON CONFLICT (telephone) DO UPDATE SET
    mot_de_passe = EXCLUDED.mot_de_passe,
    role = 'admin',
    solde_starcoin = EXCLUDED.solde_starcoin,
    plan_actuel = EXCLUDED.plan_actuel;

-- ============================================================================
-- PARAMÈTRES SYSTÈME
-- ============================================================================
INSERT INTO admin_settings (cle_configuration, valeur_configuration, description)
VALUES ('exchange_rate_cfa_sc', '50.00', 'Parité StarMaj : 50 Francs CFA = 1 StarCoin (SC)')
ON CONFLICT (cle_configuration) DO UPDATE SET valeur_configuration = EXCLUDED.valeur_configuration;

INSERT INTO admin_settings (cle_configuration, valeur_configuration, description)
VALUES ('scheduler_interval_minutes', '2', 'Intervalle d exécution planifié RouterOS /tool fetch en minutes')
ON CONFLICT (cle_configuration) DO UPDATE SET valeur_configuration = EXCLUDED.valeur_configuration;

INSERT INTO admin_settings (cle_configuration, valeur_configuration, description)
VALUES ('auto_healing_cpu_threshold', '85', 'Seuil CPU en % déclenchant la réparation automatique IA')
ON CONFLICT (cle_configuration) DO UPDATE SET valeur_configuration = EXCLUDED.valeur_configuration;

-- ============================================================================
-- PASSERELLES DE PAIEMENT FINTECH NIGER
-- ============================================================================
INSERT INTO payment_gateways (nom_methode, numero_telephone_defaut, nom_beneficiaire, instructions, statut, frais_pourcentage, pays, logo_icon)
VALUES
('Airtel Money Niger', '+227 96 88 00 12', 'StarMaj Atelier SARL', 'Composez *444# -> Envoi argent -> Entrez le montant en FCFA puis collez le code SMS.', 'actif', 0.00, 'Niger', 'airtel'),
('Moov Flooz Niger', '+227 89 22 33 44', 'StarMaj Atelier SARL', 'Composez *156# -> Transfert Flooz -> Saisissez le numéro et confirmez.', 'actif', 0.00, 'Niger', 'moov'),
('Alza (Al Izza Transfert)', '+227 90 77 66 55', 'Compte StarMaj Al Izza', 'Transfert direct en agence Al Izza ou via l application mobile Alza Cash.', 'actif', 0.00, 'Niger', 'alza'),
('Zamani Cash Niger', '+227 80 11 22 33', 'StarMaj Atelier Recouvrement', 'Composez *144# Zamani Telecom -> Envoi vers compte marchand Zamani Cash.', 'actif', 0.00, 'Niger', 'zamani'),
('Wave Niger / UBA', '+227 97 55 44 33', 'StarMaj Atelier Digital', 'Ouvrez l application Wave -> Scannez ou envoyez sans frais vers ce compte agréé.', 'actif', 0.00, 'Niger', 'wave')
ON CONFLICT (nom_methode) DO NOTHING;

-- ============================================================================
-- MODÈLES DE PORTAILS CAPTIFS PRÊTS À L EMPLOI
-- ============================================================================
INSERT INTO captive_templates (titre, theme_couleur, nom_etablissement, message_bienvenue, contact_assistance, logo_text, tarifs_affichage)
VALUES
('Portail Moderne Ambre / Sombre', 'amber_dark', 'ESPACE CYBER & RESTO NIAMEY', 'Connexion Très Haut Débit par fibre & satellite Starlink. Entrez le code coupon figurant sur votre reçu.', '+227 96 88 00 12', 'STARMAJ FIBRE', '1H = 100 CFA (2 SC) | 3H = 250 CFA (5 SC) | Illimité = 500 CFA (10 SC)'),
('Portail Émeraude Campus & Étudiants', 'emerald_modern', 'CAMPUS UNIVERSITAIRE MARADI', 'WiFi académique et loisir. Bande passante dédiée aux étudiants et chercheurs.', '+227 89 22 33 44', 'CAMPUS WIFI', '2H = 150 CFA (3 SC) | Journée = 300 CFA (6 SC) | Semaine VIP = 1500 CFA (30 SC)'),
('Portail Entreprise Bleu Azur', 'blue_corporate', 'HÔTEL & SUITES DU SAHEL', 'Accès internet premium sécurisé. Demandez votre coupon d accès à la réception.', '+227 90 77 66 55', 'SAHEL CONNECT', 'Pass VIP 24H = 1000 CFA (20 SC) | Pass Séjour = 5000 CFA (100 SC)')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PROFILS UTILISATEURS MIKHMON PAR DÉFAUT (pour l admin)
-- ============================================================================
INSERT INTO user_profiles (user_id, nom_profil, vitesse_upload, vitesse_download, limite_temps, duree_validite, prix_cfa, prix_sc, shared_users)
SELECT u.id, '1 Heure Express (2M)', '1M', '2M', '1h', '24h', 100.00, 2.00, 1
FROM users u WHERE u.telephone = '+22777514012';

INSERT INTO user_profiles (user_id, nom_profil, vitesse_upload, vitesse_download, limite_temps, duree_validite, prix_cfa, prix_sc, shared_users)
SELECT u.id, '3 Heures Standard (3M)', '1M', '3M', '3h', '24h', 250.00, 5.00, 1
FROM users u WHERE u.telephone = '+22777514012';

INSERT INTO user_profiles (user_id, nom_profil, vitesse_upload, vitesse_download, limite_temps, duree_validite, prix_cfa, prix_sc, shared_users)
SELECT u.id, 'Journée Illimitée (5M)', '2M', '5M', '12h', '24h', 500.00, 10.00, 1
FROM users u WHERE u.telephone = '+22777514012';

INSERT INTO user_profiles (user_id, nom_profil, vitesse_upload, vitesse_download, limite_temps, duree_validite, prix_cfa, prix_sc, shared_users)
SELECT u.id, 'Pass Semaine VIP (10M)', '3M', '10M', '7d', '7d', 2500.00, 50.00, 1
FROM users u WHERE u.telephone = '+22777514012';

-- ============================================================================
-- IMPORT TERMINÉ
-- ============================================================================
-- Compte Admin : +22777514012 / StarMaj@7349
-- Solde initial : 100 000 SC (= 5 000 000 FCFA)
-- Plan : aventurier (toutes options débloquées)
-- Parité : 50 FCFA = 1 SC
-- ============================================================================
