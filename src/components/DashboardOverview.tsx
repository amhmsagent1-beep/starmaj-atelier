"use client";

import React, { useState } from "react";
import { User, RouterItem, WifiTicket, Transaction } from "@/types";
import {
  Wifi,
  Coins,
  Ticket,
  TrendingUp,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Plus,
  Sliders,
} from "lucide-react";

interface DashboardOverviewProps {
  currentUser: User;
  routers: RouterItem[];
  tickets: WifiTicket[];
  transactions: Transaction[];
  onNavigateTab: (tab: string) => void;
  onRefreshAll: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentUser,
  routers,
  tickets,
  transactions,
  onNavigateTab,
  onRefreshAll,
}) => {
  const isAdmin = currentUser.role === "admin";
  const onlineRouters = routers.filter((r) => r.statut_connexion === "en_ligne").length;
  const usedTickets = tickets.filter((t) => t.est_utilise);
  const activeStock = tickets.filter((t) => !t.est_utilise && t.est_actif).length;

  const totalSalesSc = usedTickets.reduce((acc, t) => acc + parseFloat(String(t.prix_sc || 0)), 0);
  const totalSalesCfa = usedTickets.reduce((acc, t) => {
    const cfa = t.prix_cfa ? parseFloat(String(t.prix_cfa)) : parseFloat(String(t.prix_sc || 0)) * 50;
    return acc + cfa;
  }, 0);

  const userSolde = parseFloat(String(currentUser.solde_starcoin));

  return (
    <div className="space-y-6">
      {/* Hero Welcome banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Infrastructure Réseau Niger Opérationnelle
            </span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-amber-400 text-xs font-semibold">StarMaj Atelier Cloud</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Bienvenue, <span className="text-amber-400">{currentUser.nom}</span>
          </h2>
          <p className="text-slate-400 text-xs max-w-xl mt-1 leading-relaxed">
            Plateforme de gestion MikroTik unifiée, orchestrateur Hotspot WiFi, automate IA Prosper/Sophia, création automatique de pages de portail captif et module Mikhmon léger intégré.
          </p>
        </div>

        {/* Quick Balance & Refresh */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-right">
            <span className="text-[11px] text-slate-400 block uppercase font-medium">Solde Actuel</span>
            <div className="text-xl font-black text-amber-400 flex items-center justify-end gap-1.5 mt-0.5">
              <Coins className="w-5 h-5 text-amber-400" />
              {userSolde.toLocaleString()} <span className="text-xs text-amber-300">SC</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
              50 Francs CFA = 1 SC
            </span>
          </div>

          <button
            onClick={onRefreshAll}
            title="Rafraîchir les métriques"
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Routers */}
        <div
          onClick={() => onNavigateTab("routers")}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-lg cursor-pointer transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Routeurs Managés</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white">
              {onlineRouters} <span className="text-xs text-slate-500 font-normal">/ {routers.length} actifs</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              {routers.length > 0 ? "Connexion automatique /tool fetch" : "Aucun routeur"}
            </div>
          </div>
        </div>

        {/* Tickets Stock */}
        <div
          onClick={() => onNavigateTab("mikhmon")}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-lg cursor-pointer transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Stock Coupons Mikhmon</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-400">
              {activeStock} <span className="text-xs text-slate-400 font-normal">prêts</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{tickets.length} générés au total</p>
          </div>
        </div>

        {/* Chiffre d'affaires */}
        <div
          onClick={() => onNavigateTab("mikhmon")}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-lg cursor-pointer transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">CA Consommé (Tickets)</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white">
              {totalSalesCfa.toLocaleString()} <span className="text-xs text-amber-400 font-bold">CFA</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              = {totalSalesSc.toLocaleString()} SC ({usedTickets.length} sessions)
            </p>
          </div>
        </div>

        {/* Active Plan */}
        <div
          onClick={() => onNavigateTab("plans")}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-lg cursor-pointer transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Formule Actuelle</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-purple-300 capitalize truncate">
              {currentUser.plan_actuel ? currentUser.plan_actuel.replace("_", " ") : "Standard"}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              Gérer la formule <ArrowUpRight className="w-3 h-3 text-purple-400" />
            </p>
          </div>
        </div>
      </div>

      {/* Two columns : Quick Actions & Live Routers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launch Panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Actions Rapides StarMaj
          </h3>
          <p className="text-xs text-slate-400">
            Accédez directement aux opérations les plus courantes de votre atelier réseau.
          </p>

          <div className="space-y-2.5">
            <button
              onClick={() => onNavigateTab("routers")}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 border border-amber-500/40 rounded-xl text-xs font-black text-amber-300 transition group"
            >
              <span className="flex items-center gap-2.5">
                <Wifi className="w-4 h-4 text-amber-400" />
                Reconfigurer DNS &amp; Portails captifs (100% Automatique)
              </span>
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </button>

            <button
              onClick={() => onNavigateTab("mikhmon")}
              className="w-full flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-white transition group"
            >
              <span className="flex items-center gap-2.5">
                <Ticket className="w-4 h-4 text-amber-400" />
                Générer un lot de coupons Mikhmon (50/100/500)
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => onNavigateTab("optinet")}
              className="w-full flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-white transition group"
            >
              <span className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-blue-400" />
                Générateur PCC Multi-WAN (2 à 8 lignes)
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => onNavigateTab("fintech")}
              className="w-full flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-white transition group"
            >
              <span className="flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-emerald-400" />
                {isAdmin ? "Valider les recharges en attente" : "Recharger mon solde (50 CFA = 1 SC)"}
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => onNavigateTab("plans")}
              className="w-full flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition group"
            >
              <span className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-purple-400" />
                Abonnements &amp; Formules FAI
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            {isAdmin && (
              <a
                href="/admin"
                className="w-full flex items-center justify-between p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300 transition group"
              >
                <span className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Console Administrateur (Modifier les Prix un par un)
                </span>
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
              </a>
            )}
          </div>
        </div>

        {/* Connected Routers Status */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wifi className="w-5 h-5 text-emerald-400" />
                Statut en Direct des Routeurs MikroTik
              </h3>
              <button
                onClick={() => onNavigateTab("routers")}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Tout voir ({routers.length}) →
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Synchronisation automatique par le planificateur RouterOS (/tool fetch).
            </p>

            <div className="space-y-3">
              {routers.slice(0, 4).map((router) => {
                const isOnline = router.statut_connexion === "en_ligne";
                const isNotInstalled = router.statut_connexion === "non_installe" || !router.derniere_synchro;
                return (
                  <div
                    key={router.id}
                    className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full shrink-0 ${
                          isOnline
                            ? "bg-emerald-400 shadow-md shadow-emerald-400/50 animate-pulse"
                            : isNotInstalled
                            ? "bg-rose-500"
                            : "bg-amber-400"
                        }`}
                      ></div>
                      <div>
                        <h4 className="font-bold text-white text-xs">{router.nom_routeur}</h4>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {isOnline
                            ? `Connecté • DNS: ${router.dns_primaire || "1.1.1.1"}`
                            : isNotInstalled
                            ? "⚠️ Installation Winbox requise"
                            : `Inactif depuis ${router.minutes_depuis_synchro || 0} min`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      {isOnline ? (
                        <>
                          <div className="font-bold text-slate-200">
                            CPU : <span className="font-mono text-amber-300">{router.cpu_load}%</span> •{" "}
                            <span className="text-emerald-400">{router.active_hotspot_users}</span> clients
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Uptime : {router.uptime || "0m"}
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => onNavigateTab("routers")}
                          className="px-2.5 py-1 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded text-[10px] font-bold"
                        >
                          Installer Script
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {routers.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Aucun routeur actif. Cliquez sur &quot;Routeurs MikroTik&quot; pour en ajouter.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Méthode de connexion : <strong>Polling Inversé /tool fetch (Port 443 / 80)</strong></span>
            <span className="text-emerald-400 font-semibold">Traverse NAT &amp; CGNAT à 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
