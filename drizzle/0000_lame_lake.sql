CREATE TABLE "action_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_action" varchar(100) NOT NULL,
	"nom_action" varchar(150) NOT NULL,
	"description" text,
	"categorie" varchar(50) DEFAULT 'general',
	"prix_sc" numeric(10, 2) DEFAULT '10.00' NOT NULL,
	"prix_cfa" numeric(10, 2) DEFAULT '500.00' NOT NULL,
	"actif" boolean DEFAULT true,
	"mis_a_jour_a" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "action_pricing_code_action_unique" UNIQUE("code_action")
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"cle_configuration" varchar(100) NOT NULL,
	"valeur_configuration" text NOT NULL,
	"description" text,
	"modifie_par" integer,
	"mis_a_jour_a" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_settings_cle_configuration_unique" UNIQUE("cle_configuration")
);
--> statement-breakpoint
CREATE TABLE "captive_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"titre" varchar(150) NOT NULL,
	"theme_couleur" varchar(50) DEFAULT 'amber_dark',
	"nom_etablissement" varchar(150) DEFAULT 'STARMAJ HOTSPOT ZONE',
	"message_bienvenue" text DEFAULT 'Bienvenue sur notre réseau WiFi Haute Vitesse ! Connectez-vous avec votre coupon.',
	"contact_assistance" varchar(100) DEFAULT '+227 90 00 11 22',
	"logo_text" varchar(100) DEFAULT 'STARMAJ WIFI',
	"tarifs_affichage" text DEFAULT '1H = 100 CFA (2 SC) | 3H = 250 CFA (5 SC) | 24H = 500 CFA (10 SC)',
	"afficher_popup_statut" boolean DEFAULT true,
	"html_complet" text,
	"date_creation" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom_methode" varchar(100) NOT NULL,
	"numero_telephone_defaut" varchar(100) NOT NULL,
	"nom_beneficiaire" varchar(150) NOT NULL,
	"instructions" text,
	"statut" varchar(20) DEFAULT 'actif' NOT NULL,
	"frais_pourcentage" numeric(5, 2) DEFAULT '0.00',
	"pays" varchar(50) DEFAULT 'Niger',
	"logo_icon" varchar(50) DEFAULT 'wallet',
	"mis_a_jour_a" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roaming_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nom_zone" varchar(100) NOT NULL,
	"description" text,
	"date_creation" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "router_heartbeat_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"router_id" integer,
	"token" varchar(100),
	"ip_client" varchar(64),
	"cpu_load" integer,
	"uptime" varchar(50),
	"action_prise" varchar(100),
	"commandes_repondues" text,
	"statut_alerte" varchar(50) DEFAULT 'normal',
	"date_log" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"roaming_zone_id" integer,
	"captive_template_id" integer,
	"nom_routeur" varchar(150) NOT NULL,
	"identifiant_unique_token" varchar(100) NOT NULL,
	"version_routeros" varchar(50) DEFAULT 'v7.14',
	"statut_connexion" varchar(50) DEFAULT 'hors_ligne',
	"ip_publique" varchar(64),
	"ip_locale" varchar(64) DEFAULT '192.168.88.1',
	"dns_primaire" varchar(64) DEFAULT '1.1.1.1',
	"dns_secondaire" varchar(64) DEFAULT '8.8.8.8',
	"dns_nom_domaine" varchar(100) DEFAULT 'starmaj.hotspot',
	"hotspot_interface" varchar(64) DEFAULT 'bridge-hotspot',
	"modele" varchar(100) DEFAULT 'MikroTik RouterBOARD',
	"cpu_load" integer DEFAULT 0,
	"ram_free_mb" integer DEFAULT 128,
	"uptime" varchar(50) DEFAULT '0d 0h 0m',
	"active_hotspot_users" integer DEFAULT 0,
	"derniere_synchro" timestamp,
	"auto_repair_enabled" boolean DEFAULT true,
	"pcc_enabled" boolean DEFAULT false,
	"pcc_lines_count" integer DEFAULT 2,
	"script_pending" text,
	"date_creation" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "routers_identifiant_unique_token_unique" UNIQUE("identifiant_unique_token")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_code" varchar(50) NOT NULL,
	"plan_nom" varchar(100) DEFAULT 'Plan',
	"montant_sc" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"montant_cfa" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"statut" varchar(20) DEFAULT 'active' NOT NULL,
	"max_routeurs" integer DEFAULT 15,
	"max_antennes" varchar(50) DEFAULT '10',
	"auto_ia_credits" integer DEFAULT 1,
	"roaming_routeurs" integer DEFAULT 2,
	"date_debut" timestamp DEFAULT now() NOT NULL,
	"date_fin" timestamp,
	"date_creation" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "third_party_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"router_id" integer,
	"user_id" integer NOT NULL,
	"marque" varchar(50) NOT NULL,
	"nom_appareil" varchar(100) NOT NULL,
	"adresse_ip" varchar(64) NOT NULL,
	"adresse_mac" varchar(50),
	"vlan_id" integer DEFAULT 10,
	"statut" varchar(50) DEFAULT 'en_ligne',
	"date_creation" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"router_id" integer,
	"profile_id" integer,
	"nom_lot" varchar(150) NOT NULL,
	"quantite" integer DEFAULT 50,
	"template_design" varchar(50) DEFAULT 'mikhmon_thermal',
	"logo_ticket" varchar(150) DEFAULT 'STARMAJ WIFI',
	"date_creation" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"montant_sc" numeric(10, 2) NOT NULL,
	"montant_cfa" numeric(10, 2) NOT NULL,
	"methode_paiement" varchar(100),
	"numero_expediteur" varchar(100),
	"capture_ecran_url" text,
	"statut" varchar(50) DEFAULT 'en_attente' NOT NULL,
	"reference_manuelle" varchar(150),
	"commentaire_admin" text,
	"valide_par" integer,
	"date_transaction" timestamp DEFAULT now() NOT NULL,
	"date_traitement" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nom_profil" varchar(100) NOT NULL,
	"vitesse_upload" varchar(50) DEFAULT '1M',
	"vitesse_download" varchar(50) DEFAULT '2M',
	"limite_temps" varchar(50) DEFAULT '1h',
	"duree_validite" varchar(50) DEFAULT '24h',
	"prix_cfa" numeric(10, 2) DEFAULT '100.00',
	"prix_sc" numeric(10, 2) DEFAULT '2.00',
	"shared_users" integer DEFAULT 1,
	"date_creation" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" varchar(255) NOT NULL,
	"telephone" varchar(50) NOT NULL,
	"email" varchar(255),
	"mot_de_passe" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"pays" varchar(100) DEFAULT 'Niger',
	"solde_starcoin" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"plan_actuel" varchar(50) DEFAULT 'aucun',
	"plan_expire_a" timestamp,
	"date_creation" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_telephone_unique" UNIQUE("telephone")
);
--> statement-breakpoint
CREATE TABLE "wifi_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer,
	"router_id" integer,
	"user_id" integer NOT NULL,
	"code_ticket" varchar(50) NOT NULL,
	"mot_de_passe" varchar(50),
	"profil_vitesse" varchar(50) DEFAULT '1M/2M',
	"duree_validite" varchar(50) DEFAULT '1h',
	"prix_cfa" numeric(10, 2) DEFAULT '100.00',
	"prix_sc" numeric(10, 2) DEFAULT '2.00',
	"est_actif" boolean DEFAULT true,
	"est_utilise" boolean DEFAULT false,
	"session_active_mac" varchar(50),
	"derniere_ip" varchar(64),
	"date_utilisation" timestamp,
	"date_expiration" timestamp,
	"roaming_enabled" boolean DEFAULT true,
	"logo_ticket" varchar(150) DEFAULT 'STARMAJ WIFI',
	"date_creation" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wifi_tickets_code_ticket_unique" UNIQUE("code_ticket")
);
--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_modifie_par_users_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "captive_templates" ADD CONSTRAINT "captive_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roaming_zones" ADD CONSTRAINT "roaming_zones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "router_heartbeat_logs" ADD CONSTRAINT "router_heartbeat_logs_router_id_routers_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."routers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routers" ADD CONSTRAINT "routers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routers" ADD CONSTRAINT "routers_roaming_zone_id_roaming_zones_id_fk" FOREIGN KEY ("roaming_zone_id") REFERENCES "public"."roaming_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routers" ADD CONSTRAINT "routers_captive_template_id_captive_templates_id_fk" FOREIGN KEY ("captive_template_id") REFERENCES "public"."captive_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_party_devices" ADD CONSTRAINT "third_party_devices_router_id_routers_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."routers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_party_devices" ADD CONSTRAINT "third_party_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_batches" ADD CONSTRAINT "ticket_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_batches" ADD CONSTRAINT "ticket_batches_router_id_routers_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."routers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_batches" ADD CONSTRAINT "ticket_batches_profile_id_user_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_valide_par_users_id_fk" FOREIGN KEY ("valide_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wifi_tickets" ADD CONSTRAINT "wifi_tickets_batch_id_ticket_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."ticket_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wifi_tickets" ADD CONSTRAINT "wifi_tickets_router_id_routers_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."routers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wifi_tickets" ADD CONSTRAINT "wifi_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;