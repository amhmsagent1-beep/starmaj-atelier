"use client";

import React from "react";
import { User } from "@/types";
import {
  Wifi,
  Radio,
  Coins,
  ShieldCheck,
  Cpu,
  Ticket,
  Sliders,
  Sparkles,
  LogOut,
  User as UserIcon,
  ShieldAlert,
} from "lucide-react";

interface NavbarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingTransactionsCount: number;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  pendingTransactionsCount,
  onLogout,
}) => {
  const isAdmin = currentUser?.role === "admin";
  const soldeNum = currentUser ? parseFloat(String(currentUser.solde_starcoin)) : 0;

  const navItems = [
    { id: "dashboard", label: "Aperçu Global", icon: Radio },
    { id: "routers", label: "Routeurs & Portails", icon: Wifi },
    { id: "mikhmon", label: "Mikhmon Intégré", icon: Ticket },
    { id: "optinet", label: "IA & Optimisation Réseau", icon: Cpu },
    {
      id: "fintech",
      label: isAdmin ? "Fintech & Validation" : "Recharge StarCoins",
      icon: Coins,
      badge: isAdmin && pendingTransactionsCount > 0 ? pendingTransactionsCount : null,
    },
    { id: "roaming", label: "Roaming & Anti-Fraude", icon: ShieldCheck },
    { id: "plans", label: "Plans & Tarifs", icon: Sliders },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-xl">
      {/* Top micro-bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-slate-800/80 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Protocole /tool fetch Automatique (CGNAT Bypass)
          </span>
          <span className="hidden md:inline text-slate-500">•</span>
          <span className="hidden md:inline text-slate-300">
            Parité Officielle : <strong className="text-amber-400">50 FCFA (XOF) = 1 StarCoin (SC)</strong>
          </span>
        </div>

        {/* User Identity Display ONLY - NO SWITCHER ALLOWED */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-200 font-semibold">{currentUser?.nom}</span>
            <span className="text-slate-500 text-[11px] font-mono">({currentUser?.telephone})</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ml-1 ${
                isAdmin
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
              }`}
            >
              {currentUser?.role}
            </span>
          </div>

          <button
            onClick={onLogout}
            title="Se déconnecter de votre compte"
            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 px-2 py-1 rounded-md transition"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                STARMAJ <span className="text-amber-400 font-extrabold">ATELIER</span>
              </h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-500/30">
                PRO v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Cloud MikroTik • Hotspot • Reconfiguration Auto • Mikhmon Intégré • 50 CFA = 1 SC
            </p>
          </div>
        </div>

        {/* User Balance & Plan Widget */}
        {currentUser && (
          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-inner">
            <div className="text-right">
              <div className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Solde StarCoin</div>
              <div className="text-base font-black text-amber-400 flex items-center justify-end gap-1">
                <Coins className="w-4 h-4 text-amber-400" />
                {soldeNum.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} <span className="text-xs font-bold text-amber-300">SC</span>
              </div>
              <div className="text-[10px] text-slate-400">
                = {(soldeNum * 50).toLocaleString("fr-FR")} FCFA
              </div>
            </div>
            <div className="h-7 w-px bg-slate-700"></div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Formule</div>
              <div className="text-xs font-bold text-emerald-400 capitalize flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {currentUser.plan_actuel ? currentUser.plan_actuel.replace("_", " ") : "Gratuit"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none py-1 border-t border-slate-800 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 font-medium rounded-lg whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
