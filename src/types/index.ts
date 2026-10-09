export interface User {
  id: number;
  nom: string;
  telephone: string; // Saisie libre internationale obligatoire
  email?: string | null; // Facultatif
  role: "admin" | "user";
  pays?: string;
  solde_starcoin: string | number;
  plan_actuel: string;
  plan_expire_a?: string;
  date_creation: string;
}

export interface CaptiveTemplate {
  id: number;
  user_id?: number | null;
  titre: string;
  theme_couleur: string;
  nom_etablissement: string;
  message_bienvenue: string;
  contact_assistance: string;
  logo_text: string;
  tarifs_affichage: string;
  afficher_popup_statut?: boolean;
  html_complet?: string;
  date_creation?: string;
}

export interface ActionPricing {
  id: number;
  code_action: string;
  nom_action: string;
  description?: string | null;
  categorie?: string | null;
  prix_sc: string | number;
  prix_cfa: string | number;
  actif: boolean;
  mis_a_jour_a?: string;
}

export interface RouterItem {
  id: number;
  user_id: number;
  roaming_zone_id?: number | null;
  captive_template_id?: number | null;
  nom_routeur: string;
  identifiant_unique_token: string;
  version_routeros: string;
  statut_connexion: "en_ligne" | "hors_ligne" | "non_installe" | "attention";
  installation_requise?: boolean;
  minutes_depuis_synchro?: number | null;
  ip_publique?: string;
  ip_locale?: string;
  dns_primaire?: string;
  dns_secondaire?: string;
  dns_nom_domaine?: string;
  hotspot_interface?: string;
  modele?: string;
  cpu_load: number;
  ram_free_mb: number;
  uptime: string;
  active_hotspot_users: number;
  derniere_synchro?: string;
  auto_repair_enabled: boolean;
  pcc_enabled: boolean;
  pcc_lines_count: number;
  script_pending?: string;
  user_nom?: string;
  user_email?: string;
  user_phone?: string;
  nom_zone?: string;
  template_titre?: string;
  nom_etablissement?: string;
  theme_couleur?: string;
}

export interface PaymentGateway {
  id: number;
  nom_methode: string;
  numero_telephone_defaut: string;
  nom_beneficiaire: string;
  instructions: string;
  statut: "actif" | "inactif";
  frais_pourcentage: string | number;
  pays: string;
  logo_icon: string;
  mis_a_jour_a?: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: "depot" | "achat_plan" | "achat_ticket";
  montant_sc: string | number;
  montant_cfa: string | number;
  methode_paiement: string;
  numero_expediteur?: string;
  capture_ecran_url?: string;
  statut: "en_attente" | "valide" | "rejete";
  reference_manuelle: string;
  commentaire_admin?: string;
  valide_par?: number;
  date_transaction: string;
  date_traitement?: string;
  user_nom?: string;
  user_email?: string;
  user_phone?: string;
  validateur_nom?: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  nom_profil: string;
  vitesse_upload: string;
  vitesse_download: string;
  limite_temps: string;
  duree_validite: string;
  prix_cfa?: string | number;
  prix_sc: string | number;
  shared_users: number;
  date_creation?: string;
}

export interface TicketBatch {
  id: number;
  user_id: number;
  router_id: number;
  profile_id: number;
  nom_lot: string;
  quantite: number;
  template_design: string;
  logo_ticket?: string;
  date_creation: string;
  nom_routeur?: string;
  identifiant_unique_token?: string;
  nom_profil?: string;
  vitesse_upload?: string;
  vitesse_download?: string;
  prix_cfa?: string | number;
  prix_sc?: string | number;
  tickets_total?: number;
  tickets_utilises?: number;
}

export interface WifiTicket {
  id: number;
  batch_id: number;
  router_id: number;
  user_id: number;
  code_ticket: string;
  mot_de_passe?: string;
  profil_vitesse: string;
  duree_validite: string;
  prix_cfa?: string | number;
  prix_sc: string | number;
  est_actif: boolean;
  est_utilise: boolean;
  session_active_mac?: string;
  derniere_ip?: string;
  date_utilisation?: string;
  date_expiration?: string;
  roaming_enabled: boolean;
  logo_ticket?: string;
  date_creation: string;
  nom_routeur?: string;
  nom_lot?: string;
  template_design?: string;
}

export interface RoamingZone {
  id: number;
  user_id: number;
  nom_zone: string;
  description?: string;
  routers_count?: number;
}

export interface ThirdPartyDevice {
  id: number;
  router_id?: number;
  user_id: number;
  marque: string;
  nom_appareil: string;
  adresse_ip: string;
  adresse_mac?: string;
  vlan_id: number;
  statut: string;
  nom_routeur?: string;
}
