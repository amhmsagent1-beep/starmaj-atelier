"use client";

import React, { useState, useEffect } from "react";
import { User, RouterItem, UserProfile, TicketBatch, WifiTicket, CaptiveTemplate } from "@/types";
import {
  Ticket,
  Printer,
  Plus,
  Coins,
  TrendingUp,
  Sliders,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Sparkles,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Layout,
  ExternalLink,
  Smartphone,
  Save,
  HelpCircle,
  FileText,
  Edit2,
  Trash2,
  Unlock,
  Image,
  Tag,
} from "lucide-react";

interface MikhmonStudioProps {
  currentUser: User;
  routers: RouterItem[];
  onRefreshAll: () => void;
}

export const MikhmonStudio: React.FC<MikhmonStudioProps> = ({
  currentUser,
  routers,
  onRefreshAll,
}) => {
  const [activeTab, setActiveTab] = useState<"generator" | "sales" | "profiles" | "tickets" | "portals">("generator");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [batches, setBatches] = useState<TicketBatch[]>([]);
  const [tickets, setTickets] = useState<WifiTicket[]>([]);
  const [salesStats, setSalesStats] = useState<any>(null);
  const [portalTemplates, setPortalTemplates] = useState<CaptiveTemplate[]>([]);

  // Batch Generation Form state
  const [selectedRouterId, setSelectedRouterId] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [nomLot, setNomLot] = useState("Lot Hotspot " + new Date().toLocaleDateString("fr-FR"));
  const [quantite, setQuantite] = useState<number>(50);
  const [prefixe, setPrefixe] = useState("SM");
  const [codeLongueur, setCodeLongueur] = useState(4);
  const [avecMotDePasse, setAvecMotDePasse] = useState(true);
  const [logoTicket, setLogoTicket] = useState("STARMAJ WIFI");
  const [templateDesign, setTemplateDesign] = useState("mikhmon_thermal");
  const [isGenerating, setIsGenerating] = useState(false);

  // Profile Form state (Create & Edit)
  const [nomProfil, setNomProfil] = useState("");
  const [vitesseUpload, setVitesseUpload] = useState("1M");
  const [vitesseDownload, setVitesseDownload] = useState("2M");
  const [limiteTemps, setLimiteTemps] = useState("1h");
  const [dureeValidite, setDureeValidite] = useState("24h");
  const [prixCfa, setPrixCfa] = useState(100);
  const [sharedUsers, setSharedUsers] = useState(1);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  // Action pricing state
  const [actionPrices, setActionPrices] = useState<Record<string, number>>({
    generate_batch: 10,
    create_portal: 10,
    unlock_mac: 2,
  });

  // Ticket Editing state
  const [editingTicket, setEditingTicket] = useState<WifiTicket | null>(null);
  const [editTicketCode, setEditTicketCode] = useState("");
  const [editTicketPwd, setEditTicketPwd] = useState("");
  const [editTicketCfa, setEditTicketCfa] = useState(100);
  const [editTicketValidity, setEditTicketValidity] = useState("1h");
  const [editTicketActive, setEditTicketActive] = useState(true);
  const [isSavingTicket, setIsSavingTicket] = useState(false);

  // Print Preview state with A4 density
  const [printTickets, setPrintTickets] = useState<WifiTicket[] | null>(null);
  const [printDensity, setPrintDensity] = useState<"50_a4" | "40_a4" | "18_a4" | "thermal">("50_a4");
  const [searchTicket, setSearchTicket] = useState("");

  // Captive Portal Step-by-Step Wizard state (Style OpTiNet)
  const [portalWizardStep, setPortalWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [portalTargetRouterId, setPortalTargetRouterId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [portalNomEtablissement, setPortalNomEtablissement] = useState("STARMAJ CYBER CAFE & RESTO");
  const [portalLogoText, setPortalLogoText] = useState("STARMAJ WIFI");
  const [portalTheme, setPortalTheme] = useState("amber_dark");
  const [portalMessage, setPortalMessage] = useState("Bienvenue sur notre Hotspot WiFi Ultra Rapide ! Achetez un coupon pour surfer.");
  const [portalContact, setPortalContact] = useState("+227 96 88 00 12");
  const [portalTarifs, setPortalTarifs] = useState("1H = 100 CFA (2 SC) | 3H = 250 CFA (5 SC) | Journée = 500 CFA (10 SC)");
  const [portalPolitique, setPortalPolitique] = useState(
    "L'accès à ce réseau WiFi est réservé à un usage légal. Tout piratage, abus de bande passante ou comportement nuisible entraîne l'exclusion immédiate. Règle anti-fraude active (1 seul appareil MAC par ticket)."
  );
  const [portalConditions, setPortalConditions] = useState(
    "En vous connectant avec votre coupon, vous acceptez les conditions de fourniture d'accès internet haut débit. Le décompte du temps débute dès la première connexion effective."
  );

  // Portal Live Preview active tab
  const [previewSubTab, setPreviewSubTab] = useState<"login" | "conditions" | "politique" | "contact">("login");
  const [isSavingPortal, setIsSavingPortal] = useState(false);

  const fetchProfiles = async () => {
    try {
      const res = await fetch(`/api/mikhmon/profiles?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setProfiles(data.profiles);
        if (data.profiles.length > 0 && !selectedProfileId) {
          setSelectedProfileId(data.profiles[0].id.toString());
        }
      }

      // Fetch action pricing
      const pRes = await fetch("/api/action-pricing");
      const pData = await pRes.json();
      if (pData.success && pData.pricing) {
        const pMap: Record<string, number> = {};
        pData.pricing.forEach((p: any) => {
          pMap[p.code_action] = parseFloat(p.prix_sc);
        });
        setActionPrices((prev) => ({ ...prev, ...pMap }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch(`/api/mikhmon/batches?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) setBatches(data.batches);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/mikhmon/tickets?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) setTickets(data.tickets);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSalesStats = async () => {
    try {
      const res = await fetch(`/api/mikhmon/stats?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) setSalesStats(data.stats);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPortals = async () => {
    try {
      const res = await fetch(`/api/captive-portal?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setPortalTemplates(data.templates);
        if (data.templates.length > 0 && !selectedTemplateId) {
          loadPortalToForm(data.templates[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPortalToForm = (tpl: any) => {
    setSelectedTemplateId(tpl.id);
    setPortalNomEtablissement(tpl.nom_etablissement || "HOTSPOT ZONE");
    setPortalTheme(tpl.theme_couleur || "amber_dark");
    setPortalMessage(tpl.message_bienvenue || "");
    setPortalContact(tpl.contact_assistance || "+227 ");
    setPortalTarifs(tpl.tarifs_affichage || "");
  };

  useEffect(() => {
    fetchProfiles();
    fetchBatches();
    fetchTickets();
    fetchSalesStats();
    fetchPortals();
    if (routers.length > 0 && !selectedRouterId) {
      setSelectedRouterId(routers[0].id.toString());
    }
  }, [currentUser.id, routers]);

  // Generate batch with custom logo
  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouterId || !selectedProfileId || !nomLot) {
      alert("Veuillez sélectionner un routeur et un profil");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/mikhmon/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          routerId: parseInt(selectedRouterId, 10),
          profileId: parseInt(selectedProfileId, 10),
          nomLot,
          quantite,
          prefixe,
          codeLongueur,
          avecMotDePasse,
          logoTicket: logoTicket.trim() || "STARMAJ WIFI",
          templateDesign,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Succès ! ${data.quantite} tickets ont été générés pour le routeur avec le logo '${logoTicket}'.`);
        fetchBatches();
        fetchTickets();
        fetchSalesStats();
        onRefreshAll();
        const ticketsRes = await fetch(`/api/mikhmon/tickets?batchId=${data.batchId}`);
        const ticketsData = await ticketsRes.json();
        if (ticketsData.success && ticketsData.tickets.length > 0) {
          setPrintTickets(ticketsData.tickets);
        }
      } else {
        alert(data.error || "Erreur de génération");
      }
    } catch (err: any) {
      alert("Erreur serveur : " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Create or Update Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomProfil.trim()) return;

    const calculatedSc = parseFloat((prixCfa / 50).toFixed(2));
    setIsCreatingProfile(true);

    try {
      const isEdit = !!editingProfile;
      const res = await fetch("/api/mikhmon/profiles", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProfile?.id,
          userId: currentUser.id,
          nomProfil,
          vitesseUpload,
          vitesseDownload,
          limiteTemps,
          dureeValidite,
          prixCfa,
          prixSc: calculatedSc,
          sharedUsers,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNomProfil("");
        setEditingProfile(null);
        fetchProfiles();
        alert(isEdit ? "Profil mis à jour avec succès !" : "Nouveau profil créé !");
      } else {
        alert(data.error || "Erreur enregistrement profil");
      }
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const openEditProfile = (p: UserProfile) => {
    setEditingProfile(p);
    setNomProfil(p.nom_profil);
    setVitesseUpload(p.vitesse_upload);
    setVitesseDownload(p.vitesse_download);
    setLimiteTemps(p.limite_temps);
    setDureeValidite(p.duree_validite);
    const cfa = p.prix_cfa ? parseFloat(String(p.prix_cfa)) : parseFloat(String(p.prix_sc)) * 50;
    setPrixCfa(cfa);
    setSharedUsers(p.shared_users || 1);
  };

  const handleDeleteProfile = async (profileId: number) => {
    if (!confirm("Voulez-vous vraiment supprimer ce profil de vitesse ?")) return;
    try {
      const res = await fetch(`/api/mikhmon/profiles?id=${profileId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchProfiles();
      }
    } catch (e: any) {
      alert("Erreur suppression: " + e.message);
    }
  };

  // Open ticket edit modal
  const openEditTicket = (t: WifiTicket) => {
    setEditingTicket(t);
    setEditTicketCode(t.code_ticket);
    setEditTicketPwd(t.mot_de_passe || "");
    const cfa = t.prix_cfa ? parseFloat(String(t.prix_cfa)) : parseFloat(String(t.prix_sc)) * 50;
    setEditTicketCfa(cfa);
    setEditTicketValidity(t.duree_validite);
    setEditTicketActive(t.est_actif);
  };

  // Save ticket modifications
  const handleSaveTicket = async (resetMac = false) => {
    if (!editingTicket) return;
    setIsSavingTicket(true);
    try {
      const res = await fetch("/api/mikhmon/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTicket.id,
          codeTicket: editTicketCode,
          motDePasse: editTicketPwd,
          prixCfa: editTicketCfa,
          dureeValidite: editTicketValidity,
          estActif: editTicketActive,
          resetMac,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setEditingTicket(null);
        fetchTickets();
        fetchSalesStats();
      } else {
        alert(data.error || "Erreur mise à jour ticket");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setIsSavingTicket(false);
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (!confirm("Supprimer définitivement ce ticket ? Il sera également retiré du routeur MikroTik.")) return;
    try {
      const res = await fetch(`/api/mikhmon/tickets?id=${ticketId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchTickets();
        fetchSalesStats();
      }
    } catch (e: any) {
      alert("Erreur suppression: " + e.message);
    }
  };

  // Save or update captive portal template and auto-deploy to router (OpTiNet style)
  const handleSavePortalTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingPortal(true);
    try {
      const res = await fetch("/api/captive-portal", {
        method: selectedTemplateId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTemplateId || undefined,
          userId: currentUser.id,
          titre: `Portail ${portalNomEtablissement}`,
          themeCouleur: portalTheme,
          nomEtablissement: portalNomEtablissement,
          messageBienvenue: portalMessage,
          contactAssistance: portalContact,
          logoText: portalLogoText.trim() || portalNomEtablissement.slice(0, 15).toUpperCase(),
          tarifsAffichage: portalTarifs,
          politiqueUtilisation: portalPolitique,
          conditionsGenerales: portalConditions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const savedTemplateId = data.template.id;

        // Si un routeur cible a été sélectionné pour le déploiement automatique :
        if (portalTargetRouterId) {
          await fetch("/api/routers", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: parseInt(portalTargetRouterId, 10),
              captiveTemplateId: savedTemplateId,
              autoDeployConfig: true,
            }),
          });
        }

        alert(
          "✅ PORTAIL CAPTIF CONFIGURÉ ET DÉPLOYÉ AVEC SUCCÈS !\n\n" +
            "• Tous les fichiers indispensables ont été créés : login.html, status.html, logout.html, alogin.html\n" +
            "• Les 4 pages interactives (Connexion, Conditions, Politique, Contact) sont prêtes.\n" +
            (portalTargetRouterId ? "• Le portail a été automatiquement assigné au routeur sélectionné !" : "")
        );
        fetchPortals();
        onRefreshAll();
      } else {
        alert(data.error || "Erreur création portail");
      }
    } catch (e: any) {
      alert("Erreur: " + e.message);
    } finally {
      setIsSavingPortal(false);
    }
  };

  const filteredTickets = tickets.filter(
    (t) =>
      t.code_ticket.toLowerCase().includes(searchTicket.toLowerCase()) ||
      (t.session_active_mac && t.session_active_mac.toLowerCase().includes(searchTicket.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400" />
              Module Mikhmon Léger &amp; Studio d&apos;Impression
            </h2>
            <span className="bg-amber-500/10 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold">
              50 FCFA = 1 StarCoin (SC)
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Génération industrielle, personnalisation du logo sur ticket, formats compacts <strong>(50, 40 ou 18 par page A4)</strong>, modification libre des profils et déblocage MAC.
          </p>
        </div>

        {/* Mikhmon subtabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("generator")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === "generator" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Générateur de Lots
          </button>
          <button
            onClick={() => setActiveTab("portals")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === "portals" ? "bg-amber-500 text-slate-950 font-black shadow-md" : "text-amber-400 hover:text-white"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Portails Captifs (8 Modèles)
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === "sales" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Ventes en Direct
          </button>
          <button
            onClick={() => setActiveTab("profiles")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === "profiles" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Profils Débit ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === "tickets" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Tickets ({tickets.length})
          </button>
        </div>
      </div>

      {/* TAB : CRÉATEUR DE PORTAIL CAPTIF (8 MODÈLES) */}
      {activeTab === "portals" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form & Configuration */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layout className="w-5 h-5 text-amber-400" />
                Personnalisation Complète du Portail Captif
              </h3>

              {portalTemplates.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(null);
                    setPortalNomEtablissement("NOUVEAU HOTSPOT ZONE");
                    setPortalMessage("Bienvenue sur notre WiFi Très Haut Débit.");
                  }}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Créer Nouveau Modèle
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Choisissez parmi <strong>8 thèmes professionnels</strong>. Le portail généré intègre 4 pages : <strong>Connexion</strong>, <strong>Conditions d&apos;Accès</strong>, <strong>Politique de Sécurité</strong> et <strong>Contact/Assistance</strong>.
            </p>

            {/* Existing models select */}
            {portalTemplates.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Charger un portail existant :
                </label>
                <select
                  value={selectedTemplateId || ""}
                  onChange={(e) => {
                    const id = parseInt(e.target.value, 10);
                    const t = portalTemplates.find((x) => x.id === id);
                    if (t) loadPortalToForm(t);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  {portalTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom_etablissement} ({t.titre})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ASSISTANT ÉTAPE PAR ÉTAPE (STYLE OPTINET) */}
            <div className="space-y-4">
              {/* Stepper Bar */}
              <div className="flex items-center justify-between gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-[11px]">
                {[
                  { step: 1, label: "1. Identité" },
                  { step: 2, label: "2. Thème (8)" },
                  { step: 3, label: "3. Tarifs" },
                  { step: 4, label: "4. Charte" },
                  { step: 5, label: "5. Déploiement" },
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setPortalWizardStep(s.step as any)}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition ${
                      portalWizardStep === s.step
                        ? "bg-amber-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSavePortalTemplate} className="space-y-4">
                {/* ÉTAPE 1 : IDENTITÉ & NOM DE ZONE */}
                {portalWizardStep === 1 && (
                  <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs font-bold text-amber-400 block">
                      Étape 1 sur 5 : Identité &amp; Marque du Portail
                    </span>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Nom de l&apos;Établissement / Zone WiFi *
                      </label>
                      <input
                        type="text"
                        required
                        value={portalNomEtablissement}
                        onChange={(e) => setPortalNomEtablissement(e.target.value)}
                        placeholder="Ex: ESPACE CYBER & RESTO DU SAHEL"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Logo / Nom de Marque en En-tête
                        </label>
                        <input
                          type="text"
                          value={portalLogoText}
                          onChange={(e) => setPortalLogoText(e.target.value)}
                          placeholder="STARMAJ FIBRE"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Nom de Domaine Local
                        </label>
                        <input
                          type="text"
                          disabled
                          value="starmaj.hotspot"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Message d&apos;Accueil affiché aux clients
                      </label>
                      <input
                        type="text"
                        value={portalMessage}
                        onChange={(e) => setPortalMessage(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPortalWizardStep(2)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                      >
                        Étape Suivante : Thème Visuel →
                      </button>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 2 : DESIGN & THÈME VISUEL (8 MODÈLES) */}
                {portalWizardStep === 2 && (
                  <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs font-bold text-amber-400 block">
                      Étape 2 sur 5 : Choix parmi 8 Thèmes Professionnels Réels
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: "amber_dark", name: "Ambre & Noir Cyber", color: "bg-amber-500", desc: "Sombre, contrasté" },
                        { id: "emerald_modern", name: "Émeraude Campus", color: "bg-emerald-500", desc: "Académique & Vert" },
                        { id: "blue_corporate", name: "Bleu Azur Business", color: "bg-blue-500", desc: "Hôtel & Bureau" },
                        { id: "violet_neon", name: "Violet VIP Lounge", color: "bg-purple-500", desc: "Nocturne & Ambiance" },
                        { id: "red_cyber", name: "Rouge Sport & Café", color: "bg-rose-500", desc: "Gaming & Matchs" },
                        { id: "gold_luxury", name: "Doré Prestige Luxe", color: "bg-yellow-500", desc: "Suites & Résidences" },
                        { id: "white_clean", name: "Minimaliste Blanc", color: "bg-slate-200 text-slate-900", desc: "Clair & Moderne" },
                        { id: "transit_yellow", name: "Gare & Voyageurs", color: "bg-amber-400 text-slate-900", desc: "Haute visibilité" },
                      ].map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setPortalTheme(t.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                            portalTheme === t.id
                              ? "border-amber-400 bg-slate-900 ring-2 ring-amber-500/20"
                              : "border-slate-800 bg-slate-950 hover:border-slate-700"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${t.color}`}></span>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-[11px] truncate">{t.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{t.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setPortalWizardStep(1)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                      >
                        ← Précédent
                      </button>
                      <button
                        type="button"
                        onClick={() => setPortalWizardStep(3)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                      >
                        Étape Suivante : Tarifs →
                      </button>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 3 : FORMULES & TARIFS + MOBILE MONEY */}
                {portalWizardStep === 3 && (
                  <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs font-bold text-amber-400 block">
                      Étape 3 sur 5 : Tarifs &amp; Assistance Mobile Money
                    </span>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Texte des Tarifs affiché en Encart
                      </label>
                      <input
                        type="text"
                        value={portalTarifs}
                        onChange={(e) => setPortalTarifs(e.target.value)}
                        placeholder="1H = 100 CFA | 3H = 250 CFA | Journée = 500 CFA"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Numéro d&apos;Assistance / WhatsApp / Paiement Mobile Money
                      </label>
                      <input
                        type="text"
                        value={portalContact}
                        onChange={(e) => setPortalContact(e.target.value)}
                        placeholder="+227 96 88 00 12 (Airtel, Moov, Wave)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setPortalWizardStep(2)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                      >
                        ← Précédent
                      </button>
                      <button
                        type="button"
                        onClick={() => setPortalWizardStep(4)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                      >
                        Étape Suivante : Charte &amp; Sécurité →
                      </button>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 4 : CONDITIONS GÉNÉRALES & POLITIQUE DE SÉCURITÉ */}
                {portalWizardStep === 4 && (
                  <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs font-bold text-amber-400 block">
                      Étape 4 sur 5 : Conditions d&apos;Accès &amp; Politique d&apos;Utilisation
                    </span>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Conditions Générales d&apos;Accès (Page 2) :
                      </label>
                      <textarea
                        rows={3}
                        value={portalConditions}
                        onChange={(e) => setPortalConditions(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Politique d&apos;Utilisation &amp; Sécurité (Page 3) :
                      </label>
                      <textarea
                        rows={3}
                        value={portalPolitique}
                        onChange={(e) => setPortalPolitique(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200"
                      />
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setPortalWizardStep(3)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                      >
                        ← Précédent
                      </button>
                      <button
                        type="button"
                        onClick={() => setPortalWizardStep(5)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                      >
                        Étape Suivante : Déploiement →
                      </button>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 5 : DÉPLOIEMENT AUTOMATIQUE ET CRÉATION DE TOUS LES INDISPENSABLES */}
                {portalWizardStep === 5 && (
                  <div className="space-y-3.5 bg-slate-950/70 p-4 rounded-xl border border-emerald-500/40">
                    <span className="text-xs font-bold text-emerald-400 block flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Étape 5 sur 5 : Déploiement Cloud &amp; Fichiers Indispensables (OpTiNet)
                    </span>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Associer et Déployer Automatiquement sur le Routeur :
                      </label>
                      <select
                        value={portalTargetRouterId}
                        onChange={(e) => setPortalTargetRouterId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="">Sélectionnez un routeur (ou laisser libre)...</option>
                        {routers.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nom_routeur} ({r.statut_connexion === "en_ligne" ? "En ligne" : "Non connecté"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                      <span className="font-bold text-amber-300 block mb-1">
                        ⚡ Fichiers &amp; Règles créés automatiquement par l&apos;IA :
                      </span>
                      <p>✓ <strong>login.html</strong> (Page d&apos;accueil avec logo et sélection de coupons)</p>
                      <p>✓ <strong>status.html</strong> (Page de session active avec temps restant et MAC)</p>
                      <p>✓ <strong>logout.html</strong> (Page de déconnexion volontaire du client)</p>
                      <p>✓ <strong>alogin.html</strong> (Page de confirmation et redirection dynamique)</p>
                      <p>✓ <strong>Walled Garden</strong> (Accès libre vers Airtel, Flooz, Wave sans payer)</p>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setPortalWizardStep(4)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                      >
                        ← Précédent
                      </button>

                      <button
                        type="submit"
                        disabled={isSavingPortal}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {isSavingPortal
                          ? "Génération & Déploiement..."
                          : `Créer Tous les Indispensables & Déployer (${currentUser.role === "admin" ? "Gratuit" : `${actionPrices.create_portal || 10} SC`})`}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Live Smartphone Interactive Preview with 4 sub-pages */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-400" />
                  Aperçu Réel des 4 Pages (Mode Smartphone)
                </h3>
                <span className="text-[11px] font-mono text-slate-400">MikroTik /hotspot</span>
              </div>

              {/* Page switcher for the preview */}
              <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs mb-4">
                <button
                  onClick={() => setPreviewSubTab("login")}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition ${
                    previewSubTab === "login"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  1. Connexion
                </button>
                <button
                  onClick={() => setPreviewSubTab("conditions")}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition ${
                    previewSubTab === "conditions"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  2. Conditions
                </button>
                <button
                  onClick={() => setPreviewSubTab("politique")}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition ${
                    previewSubTab === "politique"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  3. Politique
                </button>
                <button
                  onClick={() => setPreviewSubTab("contact")}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition ${
                    previewSubTab === "contact"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  4. Contact
                </button>
              </div>

              {/* Mockup Smartphone container */}
              <div className="max-w-[360px] mx-auto bg-slate-950 rounded-3xl border-4 border-slate-800 p-5 shadow-2xl text-center min-h-[460px] flex flex-col justify-between">
                <div>
                  <div className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black px-3 py-1 rounded-full uppercase mb-2">
                    {portalNomEtablissement.slice(0, 16)}
                  </div>
                  <h4 className="font-black text-white text-base leading-tight mb-1">{portalNomEtablissement}</h4>
                  <p className="text-[11px] text-slate-400 leading-snug mb-3">{portalMessage}</p>

                  {/* SUB-PAGE 1 : LOGIN */}
                  {previewSubTab === "login" && (
                    <div className="space-y-3 text-left">
                      <div className="bg-slate-900 border border-dashed border-amber-500/40 p-2 rounded-xl text-[10px] text-amber-300 font-bold text-center">
                        💰 {portalTarifs}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-0.5">
                          CODE DU TICKET / COUPON :
                        </label>
                        <input
                          type="text"
                          disabled
                          placeholder="EX: SM-7821"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-0.5">
                          MOT DE PASSE (Optionnel) :
                        </label>
                        <input
                          type="password"
                          disabled
                          placeholder="••••"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                        />
                      </div>

                      <button
                        type="button"
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs rounded-xl shadow mt-2"
                      >
                        SE CONNECTER À INTERNET
                      </button>
                    </div>
                  )}

                  {/* SUB-PAGE 2 : CONDITIONS */}
                  {previewSubTab === "conditions" && (
                    <div className="text-left bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Conditions Générales d&apos;Accès
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{portalConditions}</p>
                      <ul className="text-[10px] text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                        <li>• Débit garanti selon formule.</li>
                        <li>• Validité activée dès le 1er octet consommé.</li>
                        <li>• 1 session active simultanée par appareil MAC.</li>
                      </ul>
                    </div>
                  )}

                  {/* SUB-PAGE 3 : POLITIQUE */}
                  {previewSubTab === "politique" && (
                    <div className="text-left bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> Politique d&apos;Utilisation
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{portalPolitique}</p>
                      <ul className="text-[10px] text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                        <li>• Protection active de la vie privée.</li>
                        <li>• Filtrage anti-malware sur DNS Cloudflare/Google.</li>
                        <li>• Respect strict des réglementations Télécoms.</li>
                      </ul>
                    </div>
                  )}

                  {/* SUB-PAGE 4 : CONTACT */}
                  {previewSubTab === "contact" && (
                    <div className="text-left bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                      <span className="font-bold text-blue-400 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" /> Assistance &amp; Vente Directe
                      </span>
                      <p className="text-[11px] text-slate-300">
                        Pour tout achat de coupon ou assistance technique :
                      </p>
                      <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 font-mono text-amber-300 font-bold text-xs">
                        📞 {portalContact}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Paiements : Airtel Money, Moov Flooz, Zamani, Alza, Wave.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-900 text-[9px] text-slate-500">
                  Assistance : <strong>{portalContact}</strong> • Propulsé par StarMaj Atelier
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] text-slate-400 mt-4">
              Ce portail est responsive pour tous smartphones (iOS, Android) et injecté automatiquement dans vos routeurs.
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: GENERATEUR DE LOTS AVEC LOGO SUR TICKET */}
      {activeTab === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Générer un Nouveau Lot Industriel de Coupons
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Les tickets générés seront instantanément insérés en base et envoyés au routeur via le prochain polling <code className="text-amber-300">/tool fetch</code>.
            </p>

            <form onSubmit={handleGenerateBatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Routeur MikroTik Cible *</label>
                  <select
                    value={selectedRouterId}
                    onChange={(e) => setSelectedRouterId(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {routers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nom_routeur} ({r.statut_connexion === "en_ligne" ? "En ligne" : "Non connecté"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Profil Utilisateur (Débit &amp; Temps) *</label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom_profil} — {p.vitesse_upload}/{p.vitesse_download} ({p.prix_sc} SC = {p.prix_cfa || parseFloat(String(p.prix_sc)) * 50} CFA)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nom du Lot de Coupons *</label>
                  <input
                    type="text"
                    required
                    value={nomLot}
                    onChange={(e) => setNomLot(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Logo / Marque affiché sur le Ticket *
                  </label>
                  <input
                    type="text"
                    required
                    value={logoTicket}
                    onChange={(e) => setLogoTicket(e.target.value)}
                    placeholder="Ex: STARMAJ WIFI ou CYBER NIAMEY"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Quantité de Coupons</label>
                  <select
                    value={quantite}
                    onChange={(e) => setQuantite(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold text-amber-300"
                  >
                    <option value={18}>18 coupons (1 Page A4 format cartes)</option>
                    <option value={40}>40 coupons (1 Page A4 compacte)</option>
                    <option value={50}>50 coupons (1 Page A4 ultra-économique)</option>
                    <option value={100}>100 coupons (2 Pages A4)</option>
                    <option value={250}>250 coupons (Gros débit)</option>
                    <option value={500}>500 coupons (Lot Maxi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Préfixe Code</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={prefixe}
                    onChange={(e) => setPrefixe(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Longueur Code Alphanum</label>
                  <select
                    value={codeLongueur}
                    onChange={(e) => setCodeLongueur(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value={4}>4 caractères (ex: AB29)</option>
                    <option value={5}>5 caractères (ex: K93XZ)</option>
                    <option value={6}>6 caractères (ex: 78YQ41)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Format de Découpe / Impression Prévu</label>
                  <select
                    value={templateDesign}
                    onChange={(e) => setTemplateDesign(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="mikhmon_thermal">50 / page A4 (Ultra compact - économique)</option>
                    <option value="mikhmon_compact_40">40 / page A4 (Format intermédiaire)</option>
                    <option value="mikhmon_card_18">18 / page A4 (Grand format badge/carte)</option>
                    <option value="thermal_roll">Ticket Thermique Rouleau 58mm / 80mm</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={avecMotDePasse}
                      onChange={(e) => setAvecMotDePasse(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">
                      Générer mot de passe séparé (Login / Password)
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGenerating
                    ? "Génération en cours..."
                    : (salesStats?.quota?.est_gratuit ?? true)
                    ? `Générer le Lot de ${quantite} Tickets (GRATUIT - Quota 500)`
                    : `Générer le Lot de ${quantite} Tickets (${currentUser.role === "admin" ? "Gratuit" : `${actionPrices.generate_batch || 10} SC`})`}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Batches List */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              {/* QUOTA GRATUIT 500 TICKETS BADGE */}
              <div className="mb-4 p-3.5 rounded-xl border bg-slate-950 border-amber-500/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Quota Gratuit de Coupons
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (salesStats?.quota?.est_gratuit ?? true)
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}>
                    {(salesStats?.quota?.est_gratuit ?? true) ? "100% GRATUIT" : "Payant (10 SC)"}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full ${
                      (salesStats?.quota?.est_gratuit ?? true) ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                    style={{
                      width: `${Math.min(100, (((salesStats?.quota?.total_generes ?? 0) / 500) * 100))}%`,
                    }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                  <span>
                    <strong>{salesStats?.quota?.total_generes ?? 0}</strong> / 500 tickets générés
                  </span>
                  <span>
                    {(salesStats?.quota?.est_gratuit ?? true)
                      ? `Encore ${salesStats?.quota?.tickets_gratuits_restants ?? 500} gratuits`
                      : "Seuil 500 atteint"}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                Historique des Lots Générés
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 text-xs transition"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span className="truncate max-w-[170px]">{batch.nom_lot}</span>
                      <span className="text-amber-400 font-mono">{batch.quantite} tickets</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                      <span className="text-amber-300 font-semibold">{batch.logo_ticket || "STARMAJ"}</span>
                      <span>{new Date(batch.date_creation).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400">
                        {batch.tickets_utilises || 0} / {batch.tickets_total || batch.quantite} utilisés
                      </span>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/mikhmon/tickets?batchId=${batch.id}`);
                          const data = await res.json();
                          if (data.success) setPrintTickets(data.tickets);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-white"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimer Planche A4
                      </button>
                    </div>
                  </div>
                ))}

                {batches.length === 0 && (
                  <p className="text-xs text-slate-500 py-6 text-center">Aucun lot généré pour le moment.</p>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                1 appareil MAC par ticket • Format économique 50/page A4 supporté.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VENTES EN DIRECT (SALES TRACKING) */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Chiffre d&apos;Affaires Aujourd&apos;hui</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Journée
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {salesStats?.jour?.chiffre_affaires_cfa?.toLocaleString("fr-FR") || "0"} <span className="text-amber-400 text-sm">FCFA</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                = {salesStats?.jour?.chiffre_affaires_sc?.toLocaleString("fr-FR") || "0"} SC (
                {salesStats?.jour?.tickets_vendus || 0} tickets activés)
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>7 Derniers Jours</span>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Semaine
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {salesStats?.semaine?.chiffre_affaires_cfa?.toLocaleString("fr-FR") || "0"} <span className="text-amber-400 text-sm">FCFA</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                = {salesStats?.semaine?.chiffre_affaires_sc?.toLocaleString("fr-FR") || "0"} SC (
                {salesStats?.semaine?.tickets_vendus || 0} tickets)
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>30 Derniers Jours</span>
                <span className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Mois
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {salesStats?.mois?.chiffre_affaires_cfa?.toLocaleString("fr-FR") || "0"} <span className="text-amber-400 text-sm">FCFA</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                = {salesStats?.mois?.chiffre_affaires_sc?.toLocaleString("fr-FR") || "0"} SC (
                {salesStats?.mois?.tickets_vendus || 0} tickets)
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Stock Restant en Vente</span>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Stock
                </span>
              </div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {salesStats?.stock_disponible || 0} <span className="text-slate-300 text-sm">tickets</span>
              </div>
              <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                {salesStats?.total_tickets_consommes || 0} tickets consommés &amp; supprimés (auto)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3 : GESTION ET MODIFICATION DES PROFILS DE DEBIT */}
      {activeTab === "profiles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create or Edit profile */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              {editingProfile ? `Modifier : ${editingProfile.nom_profil}` : "Nouveau Profil de Débit"}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Limites de vitesse, durée de validité et prix (CFA / StarCoins).
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nom du Profil *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 2H Rapide (3M)"
                  value={nomProfil}
                  onChange={(e) => setNomProfil(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Upload Max</label>
                  <input
                    type="text"
                    value={vitesseUpload}
                    onChange={(e) => setVitesseUpload(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Download Max</label>
                  <input
                    type="text"
                    value={vitesseDownload}
                    onChange={(e) => setVitesseDownload(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Limite Temps</label>
                  <input
                    type="text"
                    placeholder="1h, 3h, 12h, 7d"
                    value={limiteTemps}
                    onChange={(e) => setLimiteTemps(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Validité Ticket</label>
                  <input
                    type="text"
                    placeholder="24h, 7d, 30d"
                    value={dureeValidite}
                    onChange={(e) => setDureeValidite(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Prix en Francs CFA (XOF)</label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={prixCfa}
                  onChange={(e) => setPrixCfa(parseFloat(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Équivalence : <strong>{(prixCfa / 50).toFixed(2)} SC</strong> (Taux: 50 CFA = 1 SC)
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                {editingProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfile(null);
                      setNomProfil("");
                    }}
                    className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isCreatingProfile}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
                >
                  {isCreatingProfile
                    ? "Enregistrement..."
                    : editingProfile
                    ? "Enregistrer les Modifications"
                    : "Ajouter le Profil"}
                </button>
              </div>
            </form>
          </div>

          {/* List profiles with Edit and Delete options */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              Profils Utilisateurs Configurés (Modifiables)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((p) => {
                const sc = parseFloat(String(p.prix_sc));
                const cfa = p.prix_cfa ? parseFloat(String(p.prix_cfa)) : sc * 50;
                return (
                  <div
                    key={p.id}
                    className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-white text-sm">{p.nom_profil}</h4>
                        <div className="text-right">
                          <span className="font-extrabold text-amber-400 text-sm block">{cfa} CFA</span>
                          <span className="text-[10px] text-slate-400 font-mono">({sc} SC)</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mt-2">
                        <p>
                          Vitesse : <strong className="text-slate-200">{p.vitesse_upload}</strong> up /{" "}
                          <strong className="text-slate-200">{p.vitesse_download}</strong> down
                        </p>
                        <p>
                          Session : <strong className="text-slate-200">{p.limite_temps}</strong> (Validité : {p.duree_validite})
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400 font-medium">shared-users = 1</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditProfile(p)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-amber-400" /> Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(p.id)}
                          className="p-1 bg-slate-800 hover:bg-rose-900/40 text-rose-400 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4 : TICKETS LIST, MODIFICATION ET DÉBLOCAGE MAC */}
      {activeTab === "tickets" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par code ou MAC..."
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPrintTickets(tickets)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
              >
                <Printer className="w-4 h-4" />
                Imprimer Tout le Stock ({filteredTickets.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Logo / Marque</th>
                  <th className="py-2.5 px-3">Code Ticket</th>
                  <th className="py-2.5 px-3">Mot de passe</th>
                  <th className="py-2.5 px-3">Profil Débit</th>
                  <th className="py-2.5 px-3">Prix</th>
                  <th className="py-2.5 px-3">Routeur</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">Session MAC liée</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTickets.map((t) => {
                  const sc = parseFloat(String(t.prix_sc));
                  const cfa = t.prix_cfa ? parseFloat(String(t.prix_cfa)) : sc * 50;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-sans font-bold text-amber-300">
                        {t.logo_ticket || "STARMAJ WIFI"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{t.code_ticket}</td>
                      <td className="py-2.5 px-3 text-slate-300">{t.mot_de_passe || "Identique"}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{t.profil_vitesse}</td>
                      <td className="py-2.5 px-3 font-sans font-bold text-white">
                        {cfa} CFA <span className="text-[10px] text-amber-400 font-normal">({sc} SC)</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 truncate max-w-[140px]">
                        {t.nom_routeur || "Général"}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {t.est_utilise ? (
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            Utilisé
                          </span>
                        ) : (
                          <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            En Stock
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {t.session_active_mac ? (
                          <div className="flex items-center gap-1.5 font-bold text-amber-300">
                            <span>{t.session_active_mac}</span>
                          </div>
                        ) : (
                          <span className="font-sans text-slate-500 italic">Libre</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={async () => {
                              if (
                                !confirm(
                                  `Consommer le ticket ${t.code_ticket} ?\n\nIl sera comptabilisé en chiffre d'affaires et DIRECTEMENT supprimé de votre serveur et de la mémoire du routeur MikroTik.`
                                )
                              )
                                return;
                              try {
                                const res = await fetch("/api/mikhmon/tickets", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: t.id, consumeAndDelete: true }),
                                });
                                const data = await res.json();
                                if (data.success) {
                                  alert(data.message);
                                  fetchTickets();
                                  fetchSalesStats();
                                  onRefreshAll();
                                }
                              } catch (e: any) {
                                alert("Erreur: " + e.message);
                              }
                            }}
                            title="Consommer et supprimer directement du serveur et du routeur"
                            className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 text-xs rounded border border-rose-500/30 font-bold flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-rose-400" />
                            Consommer &amp; Supprimer
                          </button>

                          <button
                            onClick={() => openEditTicket(t)}
                            title="Modifier ce coupon"
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded"
                          >
                            <Edit2 className="w-3 h-3 text-amber-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(t.id)}
                            title="Supprimer ce ticket"
                            className="p-1 bg-slate-800 hover:bg-rose-900/40 text-rose-400 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL : MODIFIER UN TICKET ET DÉBLOQUER MAC */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-amber-400" />
              Modifier le Coupon : {editingTicket.code_ticket}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ajustez le prix, le mot de passe, ou débloquez l&apos;adresse MAC si le client a changé de smartphone.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Code Ticket</label>
                <input
                  type="text"
                  value={editTicketCode}
                  onChange={(e) => setEditTicketCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mot de Passe</label>
                <input
                  type="text"
                  value={editTicketPwd}
                  onChange={(e) => setEditTicketPwd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Prix CFA (XOF)</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={editTicketCfa}
                    onChange={(e) => setEditTicketCfa(parseFloat(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Durée Validité</label>
                  <input
                    type="text"
                    value={editTicketValidity}
                    onChange={(e) => setEditTicketValidity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* MAC address binding and unlock button */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Adresse MAC liée :</span>
                  <span className="font-mono font-bold text-amber-400">
                    {editingTicket.session_active_mac || "Aucune (Libre)"}
                  </span>
                </div>

                {editingTicket.session_active_mac && (
                  <button
                    type="button"
                    onClick={() => handleSaveTicket(true)}
                    disabled={isSavingTicket}
                    className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Débloquer l&apos;adresse MAC ({currentUser.role === "admin" ? "Gratuit" : `${actionPrices.unlock_mac || 2} SC`})
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleSaveTicket(false)}
                disabled={isSavingTicket}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow"
              >
                {isSavingTicket ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT TICKETS MODAL AVEC DENSITÉS A4 : 50, 40 OU 18 PAR PAGE */}
      {printTickets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-5xl w-full p-6 shadow-2xl my-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 print:hidden gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-amber-600" />
                  Planche d&apos;Impression de Coupons ({printTickets.length} tickets)
                </h3>
                <p className="text-xs text-slate-500">
                  Choisissez la densité par feuille A4 pour économiser votre papier ou imprimer en grand format badge.
                </p>
              </div>

              {/* DENSITY SELECTOR */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700">Densité A4 :</span>
                <select
                  value={printDensity}
                  onChange={(e) => setPrintDensity(e.target.value as any)}
                  className="bg-slate-100 border border-slate-300 text-slate-900 font-bold text-xs rounded-lg px-2.5 py-1.5 cursor-pointer"
                >
                  <option value="50_a4">50 par page A4 (Ultra-économique 5x10)</option>
                  <option value="40_a4">40 par page A4 (Format compact 4x10)</option>
                  <option value="18_a4">18 par page A4 (Format badge 3x6)</option>
                  <option value="thermal">Ticket Thermique (Rouleau 58mm/80mm)</option>
                </select>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Imprimer (Ctrl+P)
                </button>
                <button
                  onClick={() => setPrintTickets(null)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* DYNAMIC PRINT GRID DEPENDING ON SELECTED DENSITY */}
            <div
              className={`py-4 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible ${
                printDensity === "50_a4"
                  ? "grid grid-cols-5 gap-1.5 print:grid-cols-5 print:gap-1"
                  : printDensity === "40_a4"
                  ? "grid grid-cols-4 gap-2 print:grid-cols-4 print:gap-1.5"
                  : printDensity === "18_a4"
                  ? "grid grid-cols-3 gap-3 print:grid-cols-3 print:gap-2"
                  : "max-w-xs mx-auto space-y-3"
              }`}
            >
              {printTickets.map((ticket) => {
                const sc = parseFloat(String(ticket.prix_sc));
                const cfa = ticket.prix_cfa ? parseFloat(String(ticket.prix_cfa)) : sc * 50;
                const logo = ticket.logo_ticket || "STARMAJ WIFI";

                // Ultra compact format (50 per A4 page)
                if (printDensity === "50_a4") {
                  return (
                    <div
                      key={ticket.id}
                      className="border border-dashed border-slate-400 rounded-md p-1.5 bg-slate-50 flex flex-col justify-between text-center relative break-inside-avoid text-[9px] shadow-xs"
                    >
                      <div className="font-black uppercase tracking-wider text-slate-900 truncate leading-none pb-0.5 border-b border-slate-300">
                        {logo}
                      </div>

                      <div className="my-1">
                        <div className="font-black font-mono text-[11px] tracking-wider text-slate-950 bg-amber-100 py-0.5 rounded border border-amber-300">
                          {ticket.code_ticket}
                        </div>
                        {ticket.mot_de_passe && ticket.mot_de_passe !== ticket.code_ticket && (
                          <div className="text-[8px] text-slate-600 font-mono mt-0.5">
                            MDP: <strong>{ticket.mot_de_passe}</strong>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-300 pt-0.5 text-[8px] font-bold text-slate-800 flex items-center justify-between">
                        <span>{ticket.profil_vitesse}</span>
                        <span className="text-amber-700 font-black">{cfa} CFA</span>
                      </div>
                    </div>
                  );
                }

                // Compact format (40 per A4 page)
                if (printDensity === "40_a4") {
                  return (
                    <div
                      key={ticket.id}
                      className="border border-dashed border-slate-400 rounded-lg p-2 bg-slate-50 flex flex-col justify-between text-center relative break-inside-avoid text-[10px] shadow-sm"
                    >
                      <div className="font-black uppercase tracking-wider text-slate-900 truncate pb-1 mb-1 border-b border-slate-300">
                        {logo}
                      </div>

                      <div className="my-1">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase">Coupon WiFi</div>
                        <div className="font-black font-mono text-xs tracking-wider text-slate-950 bg-amber-100 py-0.5 px-1 rounded border border-amber-300">
                          {ticket.code_ticket}
                        </div>
                        {ticket.mot_de_passe && ticket.mot_de_passe !== ticket.code_ticket && (
                          <div className="text-[9px] text-slate-700 font-mono mt-0.5">
                            MDP: <strong>{ticket.mot_de_passe}</strong>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-300 pt-1 text-[9px] font-bold text-slate-800 flex items-center justify-between">
                        <span>{ticket.profil_vitesse}</span>
                        <span className="text-amber-800 font-black">{cfa} CFA</span>
                      </div>
                    </div>
                  );
                }

                // Badge / Card format (18 per A4 page)
                if (printDensity === "18_a4") {
                  return (
                    <div
                      key={ticket.id}
                      className="border-2 border-dashed border-slate-400 rounded-xl p-3 bg-slate-50 flex flex-col justify-between text-center relative break-inside-avoid shadow-sm hover:border-amber-500"
                    >
                      <div className="border-b border-slate-200 pb-1.5 mb-1.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 block truncate">
                          {logo}
                        </span>
                        <span className="text-[9px] text-slate-500 block">Connexion : starmaj.hotspot</span>
                      </div>

                      <div className="my-1.5">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Code d&apos;accès Internet</div>
                        <div className="text-sm font-black font-mono tracking-wider text-slate-950 bg-amber-100 py-1 px-2 rounded-lg border border-amber-300">
                          {ticket.code_ticket}
                        </div>
                        {ticket.mot_de_passe && ticket.mot_de_passe !== ticket.code_ticket && (
                          <div className="text-[10px] text-slate-700 mt-1 font-mono">
                            Mot de passe : <strong className="text-slate-900">{ticket.mot_de_passe}</strong>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-200 pt-1.5 mt-1 text-[10px] text-slate-700 flex items-center justify-between font-bold">
                        <span>Débit : {ticket.profil_vitesse}</span>
                        <span className="text-amber-700 font-black text-xs">{cfa} CFA</span>
                      </div>

                      <div className="text-[8px] text-slate-400 mt-1">
                        1 seul appareil simultané • Validité: {ticket.duree_validite}
                      </div>
                    </div>
                  );
                }

                // Roll Thermal Printer format
                return (
                  <div
                    key={ticket.id}
                    className="border-2 border-dashed border-slate-400 rounded-xl p-4 bg-slate-50 text-center relative break-inside-avoid shadow-sm"
                  >
                    <div className="text-xs font-black uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-300">
                      {logo}
                    </div>
                    <div className="text-[10px] text-slate-500 my-1">starmaj.hotspot</div>

                    <div className="my-2 bg-amber-100 py-2 rounded-lg border border-amber-300">
                      <div className="text-[10px] uppercase font-bold text-slate-600">Code Ticket</div>
                      <div className="text-base font-black font-mono tracking-widest text-slate-950">
                        {ticket.code_ticket}
                      </div>
                      {ticket.mot_de_passe && ticket.mot_de_passe !== ticket.code_ticket && (
                        <div className="text-xs text-slate-800 font-mono mt-1">
                          MDP : <strong>{ticket.mot_de_passe}</strong>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold border-t border-slate-300 pt-1">
                      <span>{ticket.profil_vitesse}</span>
                      <span className="text-amber-700 font-black">{cfa} CFA</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">1 appareil MAC • {ticket.duree_validite}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
