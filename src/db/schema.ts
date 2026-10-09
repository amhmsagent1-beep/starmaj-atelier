import {
  pgTable,
  serial,
  varchar,
  text,
  numeric,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nom: varchar("nom", { length: 255 }).notNull(),
  telephone: varchar("telephone", { length: 50 }).notNull().unique(), // Saisie libre du numéro de téléphone international
  email: varchar("email", { length: 255 }), // Adresse email facultative
  mot_de_passe: varchar("mot_de_passe", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"), // 'admin' | 'user'
  pays: varchar("pays", { length: 100 }).default("Niger"),
  solde_starcoin: numeric("solde_starcoin", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  plan_actuel: varchar("plan_actuel", { length: 50 }).default("aucun"), // 'aucun' | 'wifi_basic' | 'wifi_pro' | 'installateur' | 'aventurier'
  plan_expire_a: timestamp("plan_expire_a"),
  date_creation: timestamp("date_creation").defaultNow().notNull(),
});

export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  cle_configuration: varchar("cle_configuration", { length: 100 })
    .notNull()
    .unique(),
  valeur_configuration: text("valeur_configuration").notNull(),
  description: text("description"),
  modifie_par: integer("modifie_par").references(() => users.id),
  mis_a_jour_a: timestamp("mis_a_jour_a").defaultNow().notNull(),
});

export const actionPricing = pgTable("action_pricing", {
  id: serial("id").primaryKey(),
  code_action: varchar("code_action", { length: 100 }).notNull().unique(), // 'add_router', 'auto_reconfig', 'generate_batch', 'pcc_generator', 'vpn_generator', 'create_portal', 'unlock_mac'
  nom_action: varchar("nom_action", { length: 150 }).notNull(),
  description: text("description"),
  categorie: varchar("categorie", { length: 50 }).default("general"), // 'routeur' | 'mikhmon' | 'optinet' | 'securite'
  prix_sc: numeric("prix_sc", { precision: 10, scale: 2 }).notNull().default("10.00"),
  prix_cfa: numeric("prix_cfa", { precision: 10, scale: 2 }).notNull().default("500.00"),
  actif: boolean("actif").default(true),
  mis_a_jour_a: timestamp("mis_a_jour_a").defaultNow().notNull(),
});

export const paymentGateways = pgTable("payment_gateways", {
  id: serial("id").primaryKey(),
  nom_methode: varchar("nom_methode", { length: 100 }).notNull(), // Wave, Alza, Moov Flooz, Airtel Money, Zamani Cash
  numero_telephone_defaut: varchar("numero_telephone_defaut", { length: 100 }).notNull(),
  nom_beneficiaire: varchar("nom_beneficiaire", { length: 150 }).notNull(),
  instructions: text("instructions"),
  statut: varchar("statut", { length: 20 }).notNull().default("actif"), // 'actif' | 'inactif'
  frais_pourcentage: numeric("frais_pourcentage", { precision: 5, scale: 2 }).default("0.00"),
  pays: varchar("pays", { length: 50 }).default("Niger"),
  logo_icon: varchar("logo_icon", { length: 50 }).default("wallet"),
  mis_a_jour_a: timestamp("mis_a_jour_a").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  plan_code: varchar("plan_code", { length: 50 }).notNull(), // 'wifi_basic' | 'wifi_pro' | 'installateur' | 'aventurier'
  plan_nom: varchar("plan_nom", { length: 100 }).default("Plan"),
  montant_sc: numeric("montant_sc", { precision: 10, scale: 2 }).notNull().default("0.00"),
  montant_cfa: numeric("montant_cfa", { precision: 10, scale: 2 }).notNull().default("0.00"),
  statut: varchar("statut", { length: 20 }).notNull().default("active"), // 'active' | 'expiree' | 'resiliee'
  max_routeurs: integer("max_routeurs").default(15),
  max_antennes: varchar("max_antennes", { length: 50 }).default("10"),
  auto_ia_credits: integer("auto_ia_credits").default(1),
  roaming_routeurs: integer("roaming_routeurs").default(2),
  date_debut: timestamp("date_debut").defaultNow().notNull(),
  date_fin: timestamp("date_fin"),
  date_creation: timestamp("date_creation").defaultNow().notNull(),
});

export const roamingZones = pgTable("roaming_zones", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  nom_zone: varchar("nom_zone", { length: 100 }).notNull(),
  description: text("description"),
  date_creation: timestamp("date_creation").defaultNow().notNull(),
});

export const captiveTemplates = pgTable("captive_templates", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  titre: varchar("titre", { length: 150 }).notNull(),
  theme_couleur: varchar("theme_couleur", { length: 50 }).default("amber_dark"), // 'amber_dark' | 'emerald_modern' | 'blue_corporate' | 'violet_neon' | 'red_cyber'
  nom_etablissement: varchar("nom_etablissement", { length: 150 }).default("STARMAJ HOTSPOT ZONE"),
  message_bienvenue: text("message_bienvenue").default("Bienvenue sur notre réseau WiFi Haute Vitesse ! Connectez-vous avec votre coupon."),
  contact_assistance: varchar("contact_assistance", { length: 100 }).default("+227 90 00 11 22"),
  logo_text: varchar("logo_text", { length: 100 }).default("STARMAJ WIFI"),
  tarifs_affichage: text("tarifs_affichage").default("1H = 100 CFA (2 SC) | 3H = 250 CFA (5 SC) | 24H = 500 CFA (10 SC)"),
  afficher_popup_statut: boolean("afficher_popup_statut").default(true),
  html_complet: text("html_complet"),
  date_creation: timestamp("date_creation").defaultNow().notNull(),
});

export const routers = pgTable("routers", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  roaming_zone_id: integer("roaming_zone_id").references(() => roamingZones.id),
  captive_template_id: integer("captive_template_id").references(() => captiveTemplates.id),
  nom_routeur: varchar("nom_routeur", { length: 150 }).notNull(),
  identifiant_unique_token: varchar("identifiant_unique_token", { length: 100 })
    .notNull()
    .unique(),
  version_routeros: varchar("version_routeros", { length: 50 }).default("v7.14"),
  statut_connexion: varchar("statut_connexion", { length: 50 }).default("hors_ligne"), // 'en_ligne' | 'hors_ligne' | 'attention'
  ip_publique: varchar("ip_publique", { length: 64 }),
  ip_locale: varchar("ip_locale", { length: 64 }).default("192.168.88.1"),
  dns_primaire: varchar("dns_primaire", { length: 64 }).default("1.1.1.1"),
  dns_secondaire: varchar("dns_secondaire", { length: 64 }).default("8.8.8.8"),
  dns_nom_domaine: varchar("dns_nom_domaine", { length: 100 }).default("starmaj.hotspot"),
  hotspot_interface: varchar("hotspot_interface", { length: 64 }).default("bridge-hotspot"),
  modele: varchar("modele", { length: 100 }).default("MikroTik RouterBOARD"),
  cpu_load: integer("cpu_load").default(0),
  ram_free_mb: integer("ram_free_mb").default(128),
  uptime: varchar("uptime", { length: 50 }).default("0d 0h 0m"),
  active_hotspot_users: integer("active_hotspot_users").default(0),
  derniere_synchro: timestamp("derniere_synchro"),
  auto_repair_enabled: boolean("auto_repair_enabled").default(true),
  pcc_enabled: boolean("pcc_enabled").default(false),
  pcc_lines_count: integer("pcc_lines_count").default(2),
  script_pending: text("script_pending"),
  date_creation: timestamp("date_creation").defaultNow().notNull(),
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  nom_profil: varchar("nom_profil", { length: 100 }).notNull(),
  vitesse_upload: varchar("vitesse_upload", { length: 50 }).default("1M"),
  vitesse_download: varchar("vitesse_download", { length: 50 }).default("2M"),
  limite_temps: varchar("limite_temps", { length: 50 }).default("1h"),
  duree_validite: varchar("duree_validite", { length: 50 }).default("24h"),
  prix_cfa: numeric("prix_cfa", { precision: 10, scale: 2 }).default("100.00"),
  prix_sc: numeric("prix_sc", { precision: 10, scale: 2 }).default("2.00"), // 50 CFA = 1 SC
  shared_users: integer("shared_users").default(1),
  date_creation: timestamp("date_creation").defaultNow().notNull(),
});

export const ticketBatches = pgTable("ticket_batches", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  router_id: integer("router_id").references(() => routers.id),
  profile_id: integer("profile_id").references(() => userProfiles.id),
  nom_lot: varchar("nom_lot", { length: 150 }).notNull(),
  quantite: integer("quantite").default(50),
  template_design: varchar("template_design", { length: 50 }).default("mikhmon_thermal"),
  logo_ticket: varchar("logo_ticket", { length: 150 }).default("STARMAJ WIFI"),
  date_creation: timestamp("date_creation").defaultNow().notNull(),
});

export const wifiTickets = pgTable("wifi_tickets", {
  id: serial("id").primaryKey(),
  batch_id: integer("batch_id").references(() => ticketBatches.id),
  router_id: integer("router_id").references(() => routers.id),
  user_id: integer("user_id").references(() => users.id).notNull(),
  code_ticket: varchar("code_ticket", { length: 50 }).notNull().unique(),
  mot_de_passe: varchar("mot_de_passe", { length: 50 }),
  profil_vitesse: varchar("profil_vitesse", { length: 50 }).default("1M/2M"),
  duree_validite: varchar("duree_validite", { length: 50 }).default("1h"),
  prix_cfa: numeric("prix_cfa", { precision: 10, scale: 2 }).default("100.00"),
  prix_sc: numeric("prix_sc", { precision: 10, scale: 2 }).default("2.00"),
  est_actif: boolean("est_actif").default(true),
  est_utilise: boolean("est_utilise").default(false),
  session_active_mac: varchar("session_active_mac", { length: 50 }),
  derniere_ip: varchar("derniere_ip", { length: 64 }),
  date_utilisation: timestamp("date_utilisation"),
  date_expiration: timestamp("date_expiration"),
  roaming_enabled: boolean("roaming_enabled").default(true),
  logo_ticket: varchar("logo_ticket", { length: 150 }).default("STARMAJ WIFI"),
  date_creation: timestamp("date_creation").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'depot' | 'achat_plan' | 'achat_ticket'
  montant_sc: numeric("montant_sc", { precision: 10, scale: 2 }).notNull(),
  montant_cfa: numeric("montant_cfa", { precision: 10, scale: 2 }).notNull(),
  methode_paiement: varchar("methode_paiement", { length: 100 }),
  numero_expediteur: varchar("numero_expediteur", { length: 100 }),
  capture_ecran_url: text("capture_ecran_url"),
  statut: varchar("statut", { length: 50 }).notNull().default("en_attente"), // 'en_attente' | 'valide' | 'rejete'
  reference_manuelle: varchar("reference_manuelle", { length: 150 }),
  commentaire_admin: text("commentaire_admin"),
  valide_par: integer("valide_par").references(() => users.id),
  date_transaction: timestamp("date_transaction").defaultNow().notNull(),
  date_traitement: timestamp("date_traitement"),
});

export const routerHeartbeatLogs = pgTable("router_heartbeat_logs", {
  id: serial("id").primaryKey(),
  router_id: integer("router_id").references(() => routers.id),
  token: varchar("token", { length: 100 }),
  ip_client: varchar("ip_client", { length: 64 }),
  cpu_load: integer("cpu_load"),
  uptime: varchar("uptime", { length: 50 }),
  action_prise: varchar("action_prise", { length: 100 }),
  commandes_repondues: text("commandes_repondues"),
  statut_alerte: varchar("statut_alerte", { length: 50 }).default("normal"),
  date_log: timestamp("date_log").defaultNow().notNull(),
});

export const thirdPartyDevices = pgTable("third_party_devices", {
  id: serial("id").primaryKey(),
  router_id: integer("router_id").references(() => routers.id),
  user_id: integer("user_id").references(() => users.id).notNull(),
  marque: varchar("marque", { length: 50 }).notNull(),
  nom_appareil: varchar("nom_appareil", { length: 100 }).notNull(),
  adresse_ip: varchar("adresse_ip", { length: 64 }).notNull(),
  adresse_mac: varchar("adresse_mac", { length: 50 }),
  vlan_id: integer("vlan_id").default(10),
  statut: varchar("statut", { length: 50 }).default("en_ligne"),
  date_creation: timestamp("date_creation").defaultNow().notNull(),
});
