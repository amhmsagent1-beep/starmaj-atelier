"use client";

import React, { useState, useEffect } from "react";
import { User, RouterItem, WifiTicket, Transaction, RoamingZone } from "@/types";
import { Navbar } from "@/components/Navbar";
import { DashboardOverview } from "@/components/DashboardOverview";
import { RoutersManager } from "@/components/RoutersManager";
import { MikhmonStudio } from "@/components/MikhmonStudio";
import { OptimizationOpTiNet } from "@/components/OptimizationOpTiNet";
import { FintechWallets } from "@/components/FintechWallets";
import { RoamingAntiFraud } from "@/components/RoamingAntiFraud";
import { PlansBilling } from "@/components/PlansBilling";
import { LandingAuth } from "@/components/LandingAuth";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [tickets, setTickets] = useState<WifiTicket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [roamingZones, setRoamingZones] = useState<RoamingZone[]>([]);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [loading, setLoading] = useState(true);

  // Fetch routers (verified strictly server-side)
  const loadRouters = async (user?: User) => {
    const targetUser = user || currentUser;
    if (!targetUser) return;
    try {
      const url =
        targetUser.role === "admin"
          ? "/api/routers?isAdmin=true"
          : `/api/routers?userId=${targetUser.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRouters(data.routers);
      }
    } catch (e) {
      console.error("Erreur chargement routeurs:", e);
    }
  };

  // Fetch tickets
  const loadTickets = async (user?: User) => {
    const targetUser = user || currentUser;
    if (!targetUser) return;
    try {
      const url =
        targetUser.role === "admin"
          ? "/api/mikhmon/tickets"
          : `/api/mikhmon/tickets?userId=${targetUser.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (e) {
      console.error("Erreur chargement tickets:", e);
    }
  };

  // Fetch transactions
  const loadTransactions = async (user?: User) => {
    const targetUser = user || currentUser;
    if (!targetUser) return;
    try {
      const url =
        targetUser.role === "admin"
          ? "/api/transactions?isAdmin=true"
          : `/api/transactions?userId=${targetUser.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (e) {
      console.error("Erreur chargement transactions:", e);
    }
  };

  // Fetch roaming zones
  const loadRoamingZones = async (user?: User) => {
    const targetUser = user || currentUser;
    if (!targetUser) return;
    try {
      const res = await fetch(`/api/roaming?userId=${targetUser.id}`);
      const data = await res.json();
      if (data.success) {
        setRoamingZones(data.zones);
      }
    } catch (e) {
      console.error("Erreur zones roaming:", e);
    }
  };

  const refreshAll = async (user?: User) => {
    const target = user || currentUser;
    if (!target) return;
    await Promise.all([
      loadRouters(target),
      loadTickets(target),
      loadTransactions(target),
      loadRoamingZones(target),
    ]);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Authenticate strictly with server-verified session cookie
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (sessionData.authenticated && sessionData.user) {
          setCurrentUser(sessionData.user);
          await Promise.all([
            loadRouters(sessionData.user),
            loadTickets(sessionData.user),
            loadTransactions(sessionData.user),
            loadRoamingZones(sessionData.user),
          ]);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Session check:", err);
        setCurrentUser(null);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLoginSuccess = async (user: User) => {
    try {
      // Re-verify session from backend
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const verifiedUser = sessionData.authenticated && sessionData.user ? sessionData.user : user;
      setCurrentUser(verifiedUser);
      loadRouters(verifiedUser);
      loadTickets(verifiedUser);
      loadTransactions(verifiedUser);
      loadRoamingZones(verifiedUser);
    } catch {
      setCurrentUser(user);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
  };

  const pendingCount = transactions.filter((t) => t.statut === "en_attente").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
        <h2 className="text-base font-bold">Initialisation de StarMaj Atelier...</h2>
        <p className="text-xs text-slate-400 mt-1">Connexion à la base de données PostgreSQL &amp; Cloud MikroTik</p>
      </div>
    );
  }

  // If user is not authenticated, display login / register page
  if (!currentUser) {
    return (
      <LandingAuth
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation Header with permanent user identity */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingTransactionsCount={pendingCount}
        onLogout={handleLogout}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === "dashboard" && (
          <DashboardOverview
            currentUser={currentUser}
            routers={routers}
            tickets={tickets}
            transactions={transactions}
            onNavigateTab={setActiveTab}
            onRefreshAll={() => refreshAll(currentUser)}
          />
        )}

        {activeTab === "routers" && (
          <RoutersManager
            routers={routers}
            currentUser={currentUser}
            roamingZones={roamingZones}
            onRefresh={() => refreshAll(currentUser)}
          />
        )}

        {activeTab === "mikhmon" && (
          <MikhmonStudio
            currentUser={currentUser}
            routers={routers}
            onRefreshAll={() => refreshAll(currentUser)}
          />
        )}

        {activeTab === "optinet" && (
          <OptimizationOpTiNet
            currentUser={currentUser}
            routers={routers}
          />
        )}

        {activeTab === "fintech" && (
          <FintechWallets
            currentUser={currentUser}
            onRefreshAll={() => refreshAll(currentUser)}
          />
        )}

        {activeTab === "roaming" && (
          <RoamingAntiFraud
            currentUser={currentUser}
            routers={routers}
            roamingZones={roamingZones}
            tickets={tickets}
            onRefresh={() => refreshAll(currentUser)}
          />
        )}

        {activeTab === "plans" && (
          <PlansBilling
            currentUser={currentUser}
            onRefreshAll={() => refreshAll(currentUser)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            STARMAJ ATELIER • Gestion Cloud MikroTik, Hotspot &amp; Mikhmon Intégré
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-mono">
              Connecté : {currentUser.nom} ({currentUser.role.toUpperCase()})
            </span>
            <span>•</span>
            <span className="text-slate-400 font-mono">
              Parité 50 FCFA = 1 StarCoin (SC)
            </span>
            <span>•</span>
            <a
              href="/admin"
              className="text-amber-400 hover:text-amber-300 font-bold underline"
            >
              Accès Superviseur Admin (/admin)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
