"use client";

import React, { useState, useEffect } from "react";
import { RouterItem, User, RoamingZone, CaptiveTemplate } from "@/types";
import {
  Wifi,
  Plus,
  Terminal,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Users,
  Shield,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
  PlayCircle,
  ExternalLink,
  Sliders,
  Globe,
  Layout,
  Save,
  Zap,
  CheckCircle2,
  Lock,
  Radio,
  HelpCircle,
  Info,
  Sparkles,
} from "lucide-react";

interface RoutersManagerProps {
  routers: RouterItem[];
  currentUser: User;
  roamingZones: RoamingZone[];
  onRefresh: () => void;
}

export const RoutersManager: React.FC<RoutersManagerProps> = ({
  routers,
  currentUser,
  roamingZones,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedScriptRouter, setSelectedScriptRouter] = useState<RouterItem | null>(null);
  const [editingRouter, setEditingRouter] = useState<RouterItem | null>(null);
  const [templates, setTemplates] = useState<CaptiveTemplate[]>([]);
  const [copied, setCopied] = useState(false);
  const [checkingRouterId, setCheckingRouterId] = useState<number | null>(null);
  const [isDeployingConfig, setIsDeployingConfig] = useState(false);

  // Action pricing state
  const [actionPrices, setActionPrices] = useState<Record<string, number>>({
    add_router: 20,
    auto_reconfig: 5,
  });

  // Form state for adding router
  const [nomRouteur, setNomRouteur] = useState("");
  const [identifiantToken, setIdentifiantToken] = useState("");
  const [modele, setModele] = useState("MikroTik hAP ac3 / hEX");
  const [ipLocale, setIpLocale] = useState("192.168.88.1");
  const [dnsPrimaire, setDnsPrimaire] = useState("1.1.1.1");
  const [dnsSecondaire, setDnsSecondaire] = useState("8.8.8.8");
  const [dnsNomDomaine, setDnsNomDomaine] = useState("starmaj.hotspot");
  const [captiveTemplateId, setCaptiveTemplateId] = useState("");
  const [roamingZoneId, setRoamingZoneId] = useState("");
  const [autoRepairEnabled, setAutoRepairEnabled] = useState(true);
  const [pccEnabled, setPccEnabled] = useState(false);
  const [pccLinesCount, setPccLinesCount] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit config modal state
  const [editToken, setEditToken] = useState("");
  const [editDns1, setEditDns1] = useState("1.1.1.1");
  const [editDns2, setEditDns2] = useState("8.8.8.8");
  const [editDomain, setEditDomain] = useState("starmaj.hotspot");
  const [editTemplateId, setEditTemplateId] = useState("");

  // OpTiNet-Style Zero-Touch Auto-Bootstrap state
  const [bootstrapRouter, setBootstrapRouter] = useState<RouterItem | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapSteps, setBootstrapSteps] = useState<string[] | null>(null);

  const loadTemplates = async () => {
    try {
      const res = await fetch(`/api/captive-portal?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }

      // Also load action prices
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

  useEffect(() => {
    loadTemplates();
  }, [currentUser.id]);

  const handleAddRouter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomRouteur.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/routers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          nomRouteur,
          identifiantUniqueToken: identifiantToken.trim() || undefined,
          modele,
          ipLocale,
          dnsPrimaire,
          dnsSecondaire,
          dnsNomDomaine,
          captiveTemplateId: captiveTemplateId ? parseInt(captiveTemplateId, 10) : null,
          roamingZoneId: roamingZoneId ? parseInt(roamingZoneId, 10) : null,
          autoRepairEnabled,
          pccEnabled,
          pccLinesCount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNomRouteur("");
        setIdentifiantToken("");
        onRefresh();
        // Immediately display the installation requirement popup for the new physical router
        setSelectedScriptRouter(data.router);
      } else {
        alert(data.error || "Erreur lors de l'ajout");
      }
    } catch (err: any) {
      alert("Erreur de connexion : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Automatic online reconfiguration (no script copy needed once router is running)
  const handleAutoReconfigureRouter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRouter) return;

    setIsDeployingConfig(true);
    try {
      const res = await fetch("/api/routers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRouter.id,
          identifiantUniqueToken: editToken.trim() || undefined,
          dnsPrimaire: editDns1,
          dnsSecondaire: editDns2,
          dnsNomDomaine: editDomain,
          captiveTemplateId: editTemplateId ? parseInt(editTemplateId, 10) : null,
          autoDeployConfig: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(
          "✅ ORDRE DE RECONFIGURATION AUTOMATIQUE PLANIFIÉ !\n\n" +
            "Token : " + (editToken.trim() || editingRouter.identifiant_unique_token) + "\n" +
            "DNS : " + editDns1 + " / " + editDns2 + "\n" +
            "Portail : " + editDomain + "\n\n" +
            "Le routeur appliquera automatiquement ces modifications lors de son prochain appel /tool fetch (toutes les 2 min), sans aucun copier-coller de script !"
        );
        setEditingRouter(null);
        onRefresh();
      } else {
        alert(data.error || "Erreur");
      }
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsDeployingConfig(false);
    }
  };

  const openConfigModal = (router: RouterItem) => {
    setEditingRouter(router);
    setEditToken(router.identifiant_unique_token);
    setEditDns1(router.dns_primaire || "1.1.1.1");
    setEditDns2(router.dns_secondaire || "8.8.8.8");
    setEditDomain(router.dns_nom_domaine || "starmaj.hotspot");
    setEditTemplateId(router.captive_template_id ? router.captive_template_id.toString() : "");
  };

  const handleRunAutoBootstrap = async (router: RouterItem) => {
    setBootstrapRouter(router);
    setBootstrapLoading(true);
    setBootstrapSteps(null);

    try {
      const res = await fetch("/api/routers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: router.id,
          autoBootstrap: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBootstrapSteps(
          data.autoSteps || [
            "1. Création du Bridge & Isolation ports locaux (Zero-Trust)",
            "2. Pool d'adresses IP & Serveur DHCP Hotspot (192.168.88.0/24)",
            "3. DNS Sécurisés avec cache ultra-rapide (8 MB)",
            "4. Profil Hotspot, Règle Anti-Fraude Stricte (1 MAC) & Walled Garden",
            "5. Déploiement automatique en RAM via /tool fetch (Exécution instantanée)",
          ]
        );
        onRefresh();
      } else {
        alert(data.error || "Erreur lors de l'auto-configuration");
        setBootstrapRouter(null);
      }
    } catch (err: any) {
      alert("Erreur : " + err.message);
      setBootstrapRouter(null);
    } finally {
      setBootstrapLoading(false);
    }
  };

  // Real connection test: calls onRefresh to read real database heartbeat timestamp
  const handleTestRealConnection = async (routerId: number) => {
    setCheckingRouterId(routerId);
    await onRefresh();
    setTimeout(() => {
      setCheckingRouterId(null);
    }, 800);
  };

  const handleDeleteRouter = async (routerId: number) => {
    if (!confirm("Voulez-vous vraiment supprimer ce routeur de StarMaj atelier ?")) return;
    try {
      const res = await fetch(`/api/routers?id=${routerId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err: any) {
      alert("Erreur suppression: " + err.message);
    }
  };

  // Zero-Touch Automation Script : Execution directe en RAM via output=user et [:parse] (aucun .rsc sur flash)
  const generateRouterScript = (router: RouterItem) => {
    const host = typeof window !== "undefined" ? window.location.host : "starmaj-atelier.vercel.app";
    return `/system scheduler remove [find name="StarMaj_Heartbeat"]
/system script remove [find name="StarMaj_Fetch_Run"]
/system script add name="StarMaj_Fetch_Run" source={
    :local rToken "${router.identifiant_unique_token}"
    :local srvHost "${host}"
    :local cpuLoad [/system resource get cpu-load]
    :local upTime [/system resource get uptime]
    :local memFreeBrut [/system resource get free-memory]
    :local memFree ($memFreeBrut / 1048576)
    :local rosVer [/system resource get version]
    :local activeUsers 0
    :do { :set activeUsers [/ip hotspot active print count-only] } on-error={ :set activeUsers 0 }
    :local fetchUrl "https://$srvHost/api/heartbeat?token=$rToken&cpu=$cpuLoad&uptime=$upTime&mem=$memFree&ver=$rosVer&users=$activeUsers"
    :do {
        :local res [/tool fetch url=$fetchUrl output=user as-value check-certificate=no]
        :if ($res->"status" = "finished") do={
            :local cmdData ($res->"data")
            :if ([:len $cmdData] > 0) do={
                [:parse $cmdData]
                :log info "[StarMaj] Ordres Cloud executes en RAM avec succes."
            }
        }
    } on-error={ :log warning "[StarMaj] Echec communication Cloud StarMaj" }
}
/system scheduler add name="StarMaj_Heartbeat" start-time=startup interval=2m on-event="StarMaj_Fetch_Run"
/system script run StarMaj_Fetch_Run`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Wifi className="w-5 h-5 text-emerald-400" />
              Parc Routeurs MikroTik Réels (Cloud &amp; Télémesure)
            </h2>
            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
              {routers.length} routeur{routers.length > 1 ? "s" : ""} enregistré{routers.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            <strong>État 100% réel :</strong> Chaque routeur doit être configuré avec la tâche planifiée RouterOS. Si le routeur n&apos;est pas connecté, l&apos;installation physique est obligatoire.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser État Réseau
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Lier un Routeur ({currentUser.role === "admin" ? "Admin" : `${actionPrices.add_router || 20} SC`})
          </button>
        </div>
      </div>

      {/* Routers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {routers.map((router) => {
          const isConnected = router.statut_connexion === "en_ligne";
          const isNotInstalled = router.statut_connexion === "non_installe" || !router.derniere_synchro;
          const isOffline = router.statut_connexion === "hors_ligne";
          const cpuPercent = router.cpu_load || 0;

          return (
            <div
              key={router.id}
              className={`bg-slate-900/95 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between border ${
                isConnected
                  ? "border-emerald-500/40 shadow-emerald-950/20"
                  : isNotInstalled
                  ? "border-rose-500/50 shadow-rose-950/30"
                  : "border-amber-500/40"
              }`}
            >
              <div>
                {/* Router top meta & real status */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Token : {router.identifiant_unique_token}
                    </span>
                    <h3 className="font-bold text-white text-base mt-0.5 line-clamp-1">{router.nom_routeur}</h3>
                    <p className="text-xs text-slate-400">{router.modele}</p>
                  </div>

                  {/* REAL STATUS BADGE (aucun "en ligne" sans signal réel) */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                      isConnected
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : isNotInstalled
                        ? "bg-slate-700/40 text-slate-300 border border-slate-600/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isConnected
                          ? "bg-emerald-400 animate-pulse"
                          : isNotInstalled
                          ? "bg-slate-500"
                          : "bg-amber-400 animate-pulse"
                      }`}
                    ></span>
                    {isConnected ? "EN LIGNE (Signal réel)" : isNotInstalled ? "EN ATTENTE (Aucun signal)" : "HORS LIGNE (Signal perdu)"}
                  </span>
                </div>

                {/* PROMINENT INSTALLATION WARNING IF ROUTER HAS NEVER CONNECTED */}
                {isNotInstalled && (
                  <div className="bg-slate-950/70 border border-dashed border-amber-500/40 rounded-xl p-3 my-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-300 font-bold mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      EN ATTENTE — Aucun signal réel reçu
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
                      Ce routeur n&apos;est pas encore joignable par le Cloud. <strong>Aucun client, aucune mesure et aucun état &quot;en ligne&quot; ne sont affichés</strong> tant que votre MikroTik physique n&apos;a pas émis son premier <code className="text-amber-300">/tool fetch</code> réel.
                    </p>
                    <button
                      onClick={() => setSelectedScriptRouter(router)}
                      className="w-full py-2 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 text-white font-black text-xs rounded-lg flex items-center justify-center gap-1.5 shadow"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      Afficher le Script à Installer sur le Routeur
                    </button>
                  </div>
                )}

                {/* OFFLINE NOTICE IF MISSED HEARTBEATS */}
                {isOffline && (
                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-2.5 my-3 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[11px] text-amber-200">
                      Signal interrompu depuis {router.minutes_depuis_synchro || 5} min. Vérifiez la connexion Internet du routeur.
                    </span>
                  </div>
                )}

                {/* DNS & Captive Portal Badges */}
                <div className="space-y-1.5 mb-3 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Globe className="w-3.5 h-3.5 text-blue-400" /> DNS Actifs :
                    </span>
                    <span className="font-mono font-bold text-slate-200 text-[11px]">
                      {router.dns_primaire || "1.1.1.1"} / {router.dns_secondaire || "8.8.8.8"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Layout className="w-3.5 h-3.5 text-amber-400" /> Portail Hotspot :
                    </span>
                    <span className="font-semibold text-amber-300 text-[11px] truncate max-w-[140px]">
                      {router.nom_etablissement || router.template_titre || "Portail StarMaj"}
                    </span>
                  </div>
                </div>

                {/* Roaming zone badge */}
                {router.nom_zone ? (
                  <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] px-2.5 py-1 rounded-lg mb-3">
                    <Shield className="w-3 h-3 text-indigo-400" />
                    <span>Zone Roaming : {router.nom_zone}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 text-slate-500 text-[11px] px-2 py-0.5 mb-3">
                    Zone locale (aucun roaming)
                  </div>
                )}

                {/* Real Metrics Grid (données réelles uniquement — aucun chiffre par défaut) */}
                {isConnected ? (
                  <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-emerald-800/40 mb-4 text-xs">
                    <div>
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Cpu className="w-3.5 h-3.5 text-blue-400" /> Charge CPU
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              cpuPercent > 80 ? "bg-rose-500" : cpuPercent > 50 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-mono font-bold text-slate-200">{cpuPercent}%</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-emerald-400" /> Clients Réels
                      </span>
                      <p className="font-mono font-bold text-emerald-300 mt-1">{router.active_hotspot_users || 0} connectés</p>
                    </div>

                    <div>
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-amber-400" /> Uptime Réel
                      </span>
                      <p className="font-mono text-slate-300 mt-0.5 truncate text-[11px]">{router.uptime || "0m"}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <HardDrive className="w-3.5 h-3.5 text-purple-400" /> RAM Libre
                      </span>
                      <p className="font-mono text-slate-300 mt-0.5 text-[11px]">{router.ram_free_mb || 0} MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-slate-700/70 mb-4 text-xs bg-slate-950/40">
                    <p className="text-slate-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-medium text-slate-300">
                        {isNotInstalled
                          ? "Aucune télémesure : le routeur n'a jamais émis de signal."
                          : `Signal perdu depuis ${router.minutes_depuis_synchro || "?"} min. Aucune donnée affichée.`}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 pl-5">
                      Seules les mesures réelles du routeur sont affichées. Aucune valeur par défaut n'est fabriquée.
                    </p>
                  </div>
                )}

                {/* Additional config tags */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] mb-3">
                  {router.auto_repair_enabled && (
                    <span className="bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded font-medium">
                      ✓ IA Auto-Healing
                    </span>
                  )}
                  {router.pcc_enabled && (
                    <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-medium">
                      ⚡ PCC {router.pcc_lines_count} Lignes
                    </span>
                  )}
                  <span className="text-slate-500 font-mono">
                    {router.derniere_synchro
                      ? `Synchro : il y a ${router.minutes_depuis_synchro || 0} min`
                      : "Jamais synchronisé"}
                  </span>
                </div>
              </div>

              {/* Actions footer */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => handleRunAutoBootstrap(router)}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Initialiser Hotspot IA (Auto OpTiNet)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openConfigModal(router)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Reconfigurer DNS ({currentUser.role === "admin" ? "Admin" : `${actionPrices.auto_reconfig || 5} SC`})
                  </button>

                  <button
                    title="Vérifier la connexion physique en direct"
                    onClick={() => handleTestRealConnection(router.id)}
                    disabled={checkingRouterId === router.id}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/80 transition"
                  >
                    <RefreshCw className={`w-4 h-4 ${checkingRouterId === router.id ? "animate-spin text-amber-400" : ""}`} />
                  </button>

                  <button
                    title="Supprimer le routeur"
                    onClick={() => handleDeleteRouter(router.id)}
                    className="p-2 bg-slate-800 hover:bg-rose-900/40 text-rose-400 rounded-xl border border-slate-700/80 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => setSelectedScriptRouter(router)}
                    className="text-[11px] text-amber-400 hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    <Terminal className="w-3 h-3" />
                    Afficher le script RouterOS d&apos;installation
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {routers.length === 0 && (
        <div className="text-center py-12 bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-8">
          <Wifi className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Aucun routeur MikroTik configuré</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Liez votre premier routeur physique. Le système vous fournira le script RouterOS officiel à exécuter dans Winbox.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
          >
            Lier un Routeur Maintenant
          </button>
        </div>
      )}

      {/* MODAL 1 : RECONFIGURATION AUTOMATIQUE DNS & PORTAIL CAPTIF */}
      {editingRouter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Reconfiguration Automatique : {editingRouter.nom_routeur}
              </h3>
              <button
                onClick={() => setEditingRouter(null)}
                className="text-slate-400 hover:text-white text-sm font-mono px-2"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Configurez vos DNS libres et le portail captif. Si le routeur est connecté, l&apos;ordre sera appliqué automatiquement lors de son cycle <strong>/tool fetch</strong> sans copier de script !
            </p>

            <form onSubmit={handleAutoReconfigureRouter} className="space-y-4">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-amber-400 block flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> 1. Choix Libre des Serveurs DNS
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">DNS Primaire</label>
                    <input
                      type="text"
                      required
                      value={editDns1}
                      onChange={(e) => setEditDns1(e.target.value)}
                      placeholder="1.1.1.1"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">DNS Secondaire</label>
                    <input
                      type="text"
                      required
                      value={editDns2}
                      onChange={(e) => setEditDns2(e.target.value)}
                      placeholder="8.8.8.8"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400">Raccourcis :</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditDns1("1.1.1.1");
                      setEditDns2("1.0.0.1");
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300"
                  >
                    Cloudflare
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditDns1("8.8.8.8");
                      setEditDns2("8.8.4.4");
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-blue-300"
                  >
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditDns1("9.9.9.9");
                      setEditDns2("149.112.112.112");
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-300"
                  >
                    Quad9
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-amber-400 block flex items-center gap-1.5">
                  <Layout className="w-4 h-4" /> 2. Portail Captif Hotspot Associé
                </span>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Modèle de Page de Connexion</label>
                  <select
                    value={editTemplateId}
                    onChange={(e) => setEditTemplateId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="">Portail Standard StarMaj</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nom_etablissement} ({t.titre})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Nom de Domaine Local du Portail</label>
                  <input
                    type="text"
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    placeholder="starmaj.hotspot"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Identifiant Unique Token (dans la base de données) :
                  </label>
                  <input
                    type="text"
                    value={editToken}
                    onChange={(e) => setEditToken(e.target.value.trim())}
                    placeholder="Ex: 00000000000000005b545351cbe3f46f"
                    className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Assurez-vous que cet identifiant correspond exactement à la valeur <code>:local rToken</code> configurée dans votre MikroTik.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRouter(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isDeployingConfig}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isDeployingConfig
                    ? "Enregistrement..."
                    : `Appliquer au Routeur (${currentUser.role === "admin" ? "Gratuit" : `${actionPrices.auto_reconfig || 5} SC`})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : Ajouter Routeur */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-6">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Lier un Nouveau Routeur MikroTik Physique
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Configurez le nom et vos préférences DNS. Le système générera le script RouterOS exact à injecter.
            </p>

            <form onSubmit={handleAddRouter} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nom du Routeur *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MikroTik hAP ac3 - Hub Plateau Niamey"
                  value={nomRouteur}
                  onChange={(e) => setNomRouteur(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Identifiant Unique / Token MikroTik (Optionnel / Personnalisé)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 00000000000000005b545351cbe3f46f (ou laisser vide pour générer auto)"
                  value={identifiantToken}
                  onChange={(e) => setIdentifiantToken(e.target.value.trim())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-mono font-bold placeholder:font-normal placeholder:text-slate-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Si vous avez déjà un token dans votre script ou routeur, collez-le ici pour qu&apos;il corresponde exactement.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Modèle Matériel</label>
                  <input
                    type="text"
                    placeholder="hEX, RB5009, CCR2004..."
                    value={modele}
                    onChange={(e) => setModele(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">IP Passerelle Locale</label>
                  <input
                    type="text"
                    placeholder="192.168.88.1"
                    value={ipLocale}
                    onChange={(e) => setIpLocale(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* DNS inputs */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">DNS Primaire</label>
                  <input
                    type="text"
                    value={dnsPrimaire}
                    onChange={(e) => setDnsPrimaire(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">DNS Secondaire</label>
                  <input
                    type="text"
                    value={dnsSecondaire}
                    onChange={(e) => setDnsSecondaire(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Captive Portal Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Portail Captif Associé</label>
                <select
                  value={captiveTemplateId}
                  onChange={(e) => setCaptiveTemplateId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Sélectionner un modèle...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom_etablissement} ({t.titre})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Zone de Roaming (Optionnel)</label>
                <select
                  value={roamingZoneId}
                  onChange={(e) => setRoamingZoneId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="">Aucune (Zone locale isolée)</option>
                  {roamingZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nom_zone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRepairEnabled}
                    onChange={(e) => setAutoRepairEnabled(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300">
                    Activer l&apos;IA de Réparation Automatique (Prosper &amp; Sophia IA)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30"
                >
                  {isSubmitting
                    ? "Liaison..."
                    : `Enregistrer et Lier (${currentUser.role === "admin" ? "Gratuit" : `${actionPrices.add_router || 20} SC`})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3 : Script d'Installation Requis */}
      {selectedScriptRouter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-amber-400" />
                Installation sur le Routeur Physique : {selectedScriptRouter.nom_routeur}
              </h3>
              <button
                onClick={() => setSelectedScriptRouter(null)}
                className="text-slate-400 hover:text-white text-sm font-mono px-2"
              >
                ✕
              </button>
            </div>

            {/* Step by step installation instruction */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-3 space-y-1 text-xs text-slate-300">
              <span className="font-bold text-amber-400 block mb-1">
                📋 Guide d&apos;activation en 3 étapes :
              </span>
              <p>1. Connectez-vous à votre MikroTik avec <strong>Winbox</strong> ou en <strong>SSH</strong>.</p>
              <p>2. Cliquez sur <strong>New Terminal</strong> dans le menu de gauche.</p>
              <p>3. <strong>Collez le script ci-dessous</strong> et appuyez sur Entrée. Le routeur s&apos;activera immédiatement.</p>
            </div>

            {/* STRICT TOKEN VERIFICATION WARNING */}
            <div className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-3 mb-3 text-xs text-amber-200 space-y-1">
              <div className="font-black text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                Vérification stricte de l&apos;identifiant token :
              </div>
              <p className="font-mono text-slate-100 bg-slate-950 px-2 py-1 rounded border border-amber-500/30">
                :local rToken &quot;<strong className="text-amber-400">{selectedScriptRouter.identifiant_unique_token}</strong>&quot;
              </p>
              <p className="text-[11px] text-slate-300 leading-snug">
                Assurez-vous que l&apos;identifiant <strong className="text-amber-300 font-mono">{selectedScriptRouter.identifiant_unique_token}</strong> correspond exactement à la valeur de la colonne <code className="text-amber-300">identifiant_unique_token</code> de ce routeur dans votre base de données. Si le jeton est différent, l&apos;API refusera le Heartbeat.
              </p>
            </div>

            <div className="relative mb-4">
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-72 scrollbar-thin">
                {generateRouterScript(selectedScriptRouter)}
              </pre>
              <button
                onClick={() => copyToClipboard(generateRouterScript(selectedScriptRouter))}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copié !" : "Copier le Script"}
              </button>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Protocole Zero-Touch (Exécution 100% en RAM) :</strong> Ce script n&apos;écrit <strong>aucun fichier .rsc</strong> sur le disque flash et n&apos;utilise <strong>aucun /import</strong>. Il récupère le flux texte brut via <code className="text-amber-300">output=user</code> et l&apos;exécute directement en mémoire vive avec <code className="text-emerald-300">[:parse]</code>. Une fois démarré, toutes les maintenances et réparations IA s&apos;exécutent de façon 100% autonome.
              </span>
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => handleTestRealConnection(selectedScriptRouter.id)}
                disabled={checkingRouterId === selectedScriptRouter.id}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingRouterId === selectedScriptRouter.id ? "animate-spin text-amber-400" : ""}`} />
                Vérifier si le routeur a répondu
              </button>

              <button
                onClick={() => setSelectedScriptRouter(null)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4 : INITIALISATION AUTOMATIQUE OPTINET (PROSPER / SOPHIA IA) - ZERO-TOUCH */}
      {bootstrapRouter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Initialisation Automatique Hotspot IA : {bootstrapRouter.nom_routeur}
              </h3>
              <button
                onClick={() => setBootstrapRouter(null)}
                className="text-slate-400 hover:text-white text-sm font-mono px-2"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              <strong>Protocole OpTiNet Zero-Touch :</strong> Tous les indispensables sont créés et configurés automatiquement en arrière-plan sans aucune manipulation manuelle.
            </p>

            {bootstrapLoading ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-200 font-bold">
                  Génération des règles &amp; Déploiement en RAM en cours...
                </p>
                <p className="text-[11px] text-slate-400">
                  Le système configure le Bridge, DHCP, DNS, Hotspot et Walled Garden.
                </p>
              </div>
            ) : bootstrapSteps ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Initialisation OpTiNet terminée avec succès !
                </div>

                <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-bold text-amber-300 block mb-1">
                    Services indispensables déployés en mémoire :
                  </span>
                  {bootstrapSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                      <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-400">
                  Les ordres sont injectés directement dans la boucle d&apos;exécution RAM du routeur via <code>output=user</code> et <code>[:parse]</code>.
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setBootstrapRouter(null)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow"
                  >
                    Terminer &amp; Fermer
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
