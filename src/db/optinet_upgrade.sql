-- ==============================================================================
-- STARMAJ ATELIER - SCHÉMA COMPLET PRODUCTION & UPGRADE (STYLE OPTINET)
-- Parité Monétaire : 50 Francs CFA (XOF) = 1 StarCoin (SC)
-- Règle Génération : 100% GRATUIT jusqu'à 500 tickets, facturation au-delà
-- Automatisation : 100% Zero-Touch en RAM via /tool fetch (Aucun script manuel)
-- ==============================================================================

-- 1. Table Utilisateurs (Authentification par Numéro de Téléphone, Rôles Stricts 'admin' | 'user')
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    telephone VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    mot_de_passe VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    pays VARCHAR(100) DEFAULT 'Niger',
    solde_starcoin NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    plan_actuel VARCHAR(50) DEFAULT 'wifi_basic',
    plan_expire_a TIMESTAMP,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Table Paramètres Système & Seuils IA (Prosper & Sophia IA)
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    cle_configuration VARCHAR(100) NOT NULL UNIQUE,
    valeur_configuration TEXT NOT NULL,
    description TEXT,
    modifie_par INTEGER REFERENCES users(id) ON DELETE SET NULL,
    mis_a_jour_a TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Table Tarification Unitaire des Actions (Chaque action est modifiable un par un par l'Admin)
CREATE TABLE IF NOT EXISTS action_pricing (
    id SERIAL PRIMARY KEY,
    code_action VARCHAR(100) NOT NULL UNIQUE,
    nom_action VARCHAR(150) NOT NULL,
    description TEXT,
    categorie VARCHAR(50) DEFAULT 'general',
    prix_sc NUMERIC(10,2) NOT NULL DEFAULT 10.00,
    prix_cfa NUMERIC(10,2) NOT NULL DEFAULT 500.00,
    actif BOOLEAN DEFAULT true,
    mis_a_jour_a TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Table Passerelles de Paiement Fintech Niger
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

-- 5. Table Zones de Roaming Multi-Hotspots
CREATE TABLE IF NOT EXISTS roaming_zones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nom_zone VARCHAR(100) NOT NULL,
    description TEXT,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. Table Modèles de Portails Captifs (8 Thèmes Réels & 4 Pages Interactives)
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

-- 7. Table Routeurs MikroTik (Contrôle 100% Réel, CGNAT Bypass & Auto-Configuration)
CREATE TABLE IF NOT EXISTS routers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roaming_zone_id INTEGER REFERENCES roaming_zones(id) ON DELETE SET NULL,
    captive_template_id INTEGER REFERENCES captive_templates(id) ON DELETE SET NULL,
    nom_routeur VARCHAR(150) NOT NULL,
    identifiant_unique_token VARCHAR(100) NOT NULL UNIQUE,
    version_routeros VARCHAR(50) DEFAULT 'v7.14',
    statut_connexion VARCHAR(50) DEFAULT 'non_installe',
    ip_publique VARCHAR(64),
    ip_locale VARCHAR(64) DEFAULT '192.168.88.1',
    dns_primaire VARCHAR(64) DEFAULT '1.1.1.1',
    dns_secondaire VARCHAR(64) DEFAULT '8.8.8.8',
    dns_nom_domaine VARCHAR(100) DEFAULT 'starmaj.hotspot',
    hotspot_interface VARCHAR(64) DEFAULT 'bridge-hotspot',
    modele VARCHAR(100) DEFAULT 'MikroTik RouterBOARD',
    cpu_load INTEGER DEFAULT 0,
    ram_free_mb INTEGER DEFAULT 128,
    uptime VARCHAR(50) DEFAULT 'En attente d''installation',
    active_hotspot_users INTEGER DEFAULT 0,
    derniere_synchro TIMESTAMP,
    auto_repair_enabled BOOLEAN DEFAULT true,
    pcc_enabled BOOLEAN DEFAULT false,
    pcc_lines_count INTEGER DEFAULT 2,
    script_pending TEXT,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8. Table Profils Utilisateurs Mikhmon (Limites Débit, Temps, Prix en CFA & SC)
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

-- 9. Table Lots de Coupons Mikhmon (Avec Logo & Densité A4 : 50, 40, 18)
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

-- 10. Table Tickets WiFi Hotspot (Verrouillage MAC Anti-Fraude & Déblocage Libre)
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

-- 11. Table Transactions Financières (Recharges Mobile Money & Débits d'Actions)
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

-- 12. Table Télémesure Heartbeat RouterOS /tool fetch (Logs réels)
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

-- 13. Table Antennes & Bornes WiFi Tiers (Ubiquiti, Ruijie, Grandstream, MikroTik)
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

-- INDEXATION OPTIMISÉE POUR ULTRA-HAUTE VÉLOCITÉ
CREATE INDEX IF NOT EXISTS idx_routers_token ON routers(identifiant_unique_token);
CREATE INDEX IF NOT EXISTS idx_wifi_tickets_code ON wifi_tickets(code_ticket);
CREATE INDEX IF NOT EXISTS idx_wifi_tickets_user ON wifi_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(statut);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(telephone);

-- VALEURS INITIALES DES TARIFS D'ACTIONS (Modifiables un par un dans /admin)
INSERT INTO action_pricing (code_action, nom_action, description, categorie, prix_sc, prix_cfa, actif)
VALUES 
('add_router', 'Liaison d un nouveau Routeur MikroTik', 'Création du token sécurisé et enregistrement Cloud', 'routeur', 20.00, 1000.00, true),
('auto_reconfig', 'Reconfiguration Automatique (DNS & Portail)', 'Déploiement automatique en RAM via /tool fetch', 'routeur', 5.00, 250.00, true),
('auto_bootstrap', 'Assistant Initialisation Complète Routeur', 'Déploiement clé-en-main Hotspot, DHCP, DNS, Isolation', 'routeur', 25.00, 1250.00, true),
('generate_batch', 'Génération lot de coupons (Au-delà du quota 500)', 'Gratuit jusqu à 500 coupons, payant au-delà', 'mikhmon', 10.00, 500.00, true),
('create_portal', 'Création d un modèle de Portail Captif', 'Génération complète des 4 pages responsive', 'mikhmon', 10.00, 500.00, true),
('unlock_mac', 'Déblocage d adresse MAC sur Ticket', 'Réinitialisation de la session MAC pour nouveau smartphone', 'securite', 2.00, 100.00, true),
('add_antenna', 'Configuration & Raccordement d Antenne WiFi', 'Bypass Hotspot, VLAN et isolation automatique', 'optinet', 15.00, 750.00, true),
('pcc_generator', 'Générateur d agrégation multi-lignes PCC', 'Script RouterOS v7+ pour combiner 2 à 8 connexions WAN', 'optinet', 30.00, 1500.00, true),
('vpn_generator', 'Générateur Tunnel VPN Secours Haute Dispo (99%)', 'Configuration WireGuard / SSTP de basculement', 'optinet', 40.00, 2000.00, true)
ON CONFLICT (code_action) DO UPDATE 
SET nom_action = EXCLUDED.nom_action,
    description = EXCLUDED.description,
    prix_sc = EXCLUDED.prix_sc,
    prix_cfa = EXCLUDED.prix_cfa;
