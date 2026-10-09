import { pool } from "./index";

export async function seedDatabase() {
  const client = await pool.connect();
  try {
    // Check if admin_settings exist
    const settingsCheck = await client.query("SELECT COUNT(*) FROM admin_settings");
    if (parseInt(settingsCheck.rows[0].count) > 0) {
      return;
    }

    console.log("Configuration des paramètres système StarMaj...");

    // 1. Settings (Taux officiel: 50 FCFA = 1 StarCoin)
    await client.query(`
      INSERT INTO admin_settings (cle_configuration, valeur_configuration, description)
      VALUES 
      ('exchange_rate_cfa_sc', '50.00', 'Taux officiel StarMaj : 50 Francs CFA = 1 StarCoin (SC)'),
      ('scheduler_interval_minutes', '2', 'Intervalle d exécution planifié RouterOS /tool fetch en minutes'),
      ('auto_healing_cpu_threshold', '85', 'Seuil CPU en % déclenchant le script d optimisation automatique'),
      ('anti_fraud_max_mac', '1', 'Nombre maximum d adresses MAC simultanées par ticket Hotspot (Strict: 1)'),
      ('support_whatsapp', '+227 90 00 11 22', 'Support technique StarMaj Atelier Niger')
      ON CONFLICT (cle_configuration) DO UPDATE SET valeur_configuration = EXCLUDED.valeur_configuration;
    `);

    // 2. Passerelles Fintech Niger
    await client.query(`
      INSERT INTO payment_gateways (nom_methode, numero_telephone_defaut, nom_beneficiaire, instructions, statut, frais_pourcentage, pays, logo_icon)
      VALUES 
      ('Airtel Money Niger', '+227 96 88 00 12', 'StarMaj Atelier SARL', 'Composez *444# -> Envoi argent -> Entrez le montant en FCFA puis collez le code SMS.', 'actif', 0.00, 'Niger', 'airtel'),
      ('Moov Flooz Niger', '+227 89 22 33 44', 'StarMaj Atelier SARL', 'Composez *156# -> Transfert Flooz -> Saisissez le numéro et confirmez.', 'actif', 0.00, 'Niger', 'moov'),
      ('Alza (Al Izza Transfert)', '+227 90 77 66 55', 'Compte StarMaj Al Izza', 'Transfert direct en agence Al Izza ou via l application mobile Alza Cash vers ce numéro.', 'actif', 0.00, 'Niger', 'alza'),
      ('Zamani Cash Niger', '+227 80 11 22 33', 'StarMaj Atelier Recouvrement', 'Composez *144# Zamani Telecom -> Envoi vers compte marchand Zamani Cash.', 'actif', 0.00, 'Niger', 'zamani'),
      ('Wave Niger / UBA', '+227 97 55 44 33', 'StarMaj Atelier Digital', 'Ouvrez l application Wave -> Scannez ou envoyez sans frais vers ce compte agréé.', 'actif', 0.00, 'Niger', 'wave')
      ON CONFLICT (nom_methode) DO NOTHING;
    `);

    // 3. Portails Captifs Professionnels
    await client.query(`
      INSERT INTO captive_templates (titre, theme_couleur, nom_etablissement, message_bienvenue, contact_assistance, logo_text, tarifs_affichage)
      VALUES 
      ('Portail Moderne Ambre / Sombre', 'amber_dark', 'ESPACE CYBER & RESTO NIAMEY', 'Connexion Très Haut Débit. Entrez le code coupon figurant sur votre reçu.', '+227 96 88 00 12', 'STARMAJ FIBRE', '1H = 100 CFA (2 SC) | 3H = 250 CFA (5 SC) | Illimité = 500 CFA (10 SC)'),
      ('Portail Émeraude Campus & Étudiants', 'emerald_modern', 'CAMPUS UNIVERSITAIRE MARADI', 'WiFi académique et loisir. Bande passante dédiée aux étudiants et chercheurs.', '+227 89 22 33 44', 'CAMPUS WIFI', '2H = 150 CFA (3 SC) | Journée = 300 CFA (6 SC) | Semaine VIP = 1500 CFA (30 SC)'),
      ('Portail Entreprise Bleu Azur', 'blue_corporate', 'HÔTEL & SUITES DU SAHEL', 'Accès internet premium sécurisé. Demandez votre coupon d accès à la réception.', '+227 90 77 66 55', 'SAHEL CONNECT', 'Pass VIP 24H = 1000 CFA (20 SC) | Pass Séjour = 5000 CFA (100 SC)'),
      ('Portail Violet VIP & Lounge', 'violet_neon', 'OASIS VIP LOUNGE NIAMEY', 'Accès internet premium pour nos clients VIP. Bande passante non bridée.', '+227 96 88 00 12', 'VIP LOUNGE', '1H = 200 CFA (4 SC) | Pass Soirée = 500 CFA (10 SC) | Nuit VIP = 1000 CFA (20 SC)'),
      ('Portail Rouge Crimson Sport & Café', 'red_cyber', 'ARENA SPORT CAFE & GAMING', 'WiFi Gaming et streaming de matchs en direct. Ultra faible latence.', '+227 89 22 33 44', 'ARENA CAFE', '1H Match = 100 CFA (2 SC) | Pass 3H = 250 CFA (5 SC) | Journée = 600 CFA (12 SC)'),
      ('Portail Doré Prestige & Résidence Luxe', 'gold_luxury', 'RÉSIDENCE HÔTELIÈRE LES PALMIERS', 'Bienvenue dans votre suite. Profitez de notre réseau privé fibre optique sécurisé.', '+227 90 77 66 55', 'LES PALMIERS', 'Accès Séjour 24H = 500 CFA (10 SC) | Semaine VIP = 3000 CFA (60 SC)'),
      ('Portail Minimaliste Blanc & Moderne', 'white_clean', 'ESPACE COWORKING & BUSINESS HUB', 'Réseau professionnel dédié au télétravail, visioconférences et réunions d affaires.', '+227 80 11 22 33', 'HUB COWORK', 'Pass 2H = 150 CFA (3 SC) | Demi-Journée = 350 CFA (7 SC) | Journée Pro = 700 CFA (14 SC)'),
      ('Portail Voyageurs & Gare Express', 'transit_yellow', 'GARE ROUTIÈRE RIMBO TRANSPORT', 'Connectez-vous avant votre départ en car. Connexion rapide pour messagerie et réseaux.', '+227 97 55 44 33', 'RIMBO EXPRESS', '30 Min Express = 50 CFA (1 SC) | 2 Heures = 150 CFA (3 SC) | 5 Heures = 300 CFA (6 SC)')
      ON CONFLICT DO NOTHING;
    `);

    console.log("Paramètres système configurés sans données fictives.");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    client.release();
  }
}
