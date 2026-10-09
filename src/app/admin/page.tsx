"use client";

import React, { useState, useEffect } from "react";
import { User, ActionPricing, PaymentGateway, Transaction, RouterItem } from "@/types";
import {
  ShieldAlert,
  ShieldCheck,
  Coins,
  Sliders,
  Users,
  Smartphone,
  Wifi,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Lock,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  ArrowLeft,
  KeyRound,
  Layers,
  Sparkles,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin login form state
  const [telephone, setTelephone] = useState("+227 90 00 00 01");
  const [motDePasse, setMotDePasse] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin dashboard sections
  const [activeSection, setActiveSection] = useState<"pricing" | "users" | "validation" | "gateways" | "routers">("pricing");

  // Data states
  const [pricingList, setPricingList] = useState<ActionPricing[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [routers, setRouters] = useState<RouterItem[]>([]);

  // Editing Action Price state
  const [editingAction, setEditingAction] = useState<ActionPricing | null>(null);
  const [newScPrice, setNewScPrice] = useState<number>(10);
  const [newCfaPrice, setNewCfaPrice] = useState<number>(500);
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // Editing User state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [newSoldeSc, setNewSoldeSc] = useState<number>(0);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Editing Gateway state
  const [editingGatewayId, setEditingGatewayId] = useState<number | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editBeneficiaire, setEditBeneficiaire] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [isSavingGateway, setIsSavingGateway] = useState(false);

  // Check current session
  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (data.authenticated && data.user?.role === "admin") {
        setCurrentUser(data.user);
        loadAllAdminData();
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      console.error(e);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAllAdminData = async () => {
    loadPricing();
    loadUsers();
    loadTransactions();
    loadGateways();
    loadRouters();
  };

  const loadPricing = async () => {
    try {
      const res = await fetch("/api/action-pricing");
      const data = await res.json();
      if (data.success) setPricingList(data.pricing);
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) setUsersList(data.users);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await fetch("/api/transactions?isAdmin=true");
      const data = await res.json();
      if (data.success) setTransactions(data.transactions);
    } catch (e) {
      console.error(e);
    }
  };

  const loadGateways = async () => {
    try {
      const res = await fetch("/api/gateways");
      const data = await res.json();
      if (data.success) setGateways(data.gateways);
    } catch (e) {
      console.error(e);
    }
  };

  const loadRouters = async () => {
    try {
      const res = await fetch("/api/routers?isAdmin=true");
      const data = await res.json();
      if (data.success) setRouters(data.routers);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          telephone: telephone.trim(),
          motDePasse,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.role !== "admin") {
          setLoginError("Accès refusé : Ce compte ne possède pas les droits administrateur.");
          await fetch("/api/auth/session", { method: "DELETE" });
          return;
        }
        setCurrentUser(data.user);
        loadAllAdminData();
      } else {
        setLoginError(data.error || "Numéro ou mot de passe incorrect.");
      }
    } catch (err: any) {
      setLoginError("Erreur réseau : " + err.message);
    } finally {
      setIsLoggingIn(false);
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

  // Modify action price one by one
  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAction) return;

    setIsSavingPrice(true);
    try {
      const res = await fetch("/api/action-pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAction.id,
          prixSc: newScPrice,
          prixCfa: newCfaPrice,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setEditingAction(null);
        loadPricing();
      } else {
        alert(data.error || "Erreur lors de la modification");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setIsSavingPrice(false);
    }
  };

  // Modify user role and balance
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSavingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: editingUser.id,
          role: newRole,
          ajusterSoldeSc: newSoldeSc,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setEditingUser(null);
        loadUsers();
      } else {
        alert(data.error || "Erreur lors de la mise à jour");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  // Validate or reject transaction
  const handleValidateTx = async (txId: number, decision: "valide" | "rejete") => {
    try {
      const res = await fetch("/api/validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: txId,
          decision,
          commentaireAdmin: decision === "valide" ? "Validé par administrateur en direct" : "Rejeté par administrateur",
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadTransactions();
      } else {
        alert(data.error || "Erreur");
      }
    } catch (e: any) {
      alert("Erreur: " + e.message);
    }
  };

  // Save payment gateway number
  const handleSaveGateway = async (gatewayId: number) => {
    setIsSavingGateway(true);
    try {
      const res = await fetch("/api/gateways", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: gatewayId,
          numeroTelephoneDefaut: editPhone,
          nomBeneficiaire: editBeneficiaire,
          instructions: editInstructions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingGatewayId(null);
        loadGateways();
        alert("Numéro de paiement mis à jour avec succès !");
      } else {
        alert(data.error || "Erreur");
      }
    } catch (e: any) {
      alert("Erreur: " + e.message);
    } finally {
      setIsSavingGateway(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-3" />
        <p className="text-xs text-slate-400">Vérification des droits administrateur...</p>
      </div>
    );
  }

  // LOGIN PAGE FOR DEDICATED ADMIN URL /admin
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 rounded-3xl p-8 shadow-2xl relative">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à l&apos;Accueil Client
          </Link>

          <div className="text-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20 mb-3">
              <ShieldAlert className="w-7 h-7 text-slate-950" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              PORTAIL SUPERVISEUR <span className="text-amber-400">ADMIN</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Connexion sécurisée réservée exclusivement aux administrateurs réseau StarMaj Atelier.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl mb-4 text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Numéro de Téléphone Administrateur
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="+227 90 00 00 01"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-mono focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Mot de Passe Sécurisé
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-4"
            >
              {isLoggingIn ? "Vérification..." : "Se Connecter en tant qu'Administrateur"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
            Protégé par vérification stricte en base de données PostgreSQL • Aucun accès non-admin toléré.
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED ADMIN DASHBOARD
  const pendingCount = transactions.filter((t) => t.statut === "en_attente").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Admin Navbar */}
      <header className="border-b border-amber-500/30 bg-slate-900/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ShieldAlert className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white">
                  STARMAJ <span className="text-amber-400">ADMIN</span>
                </h1>
                <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/40">
                  CONSOLE SUPERVISEUR
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tarification des actions, gestion des rôles, validation des dépôts et routeurs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 transition"
            >
              Vue Client →
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        </div>

        {/* Admin Section Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-slate-800 flex space-x-1 overflow-x-auto py-1">
          <button
            onClick={() => setActiveSection("pricing")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSection === "pricing"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Tarifs des Actions (Prix Un par Un)
          </button>

          <button
            onClick={() => setActiveSection("users")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSection === "users"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Utilisateurs &amp; Rôles ({usersList.length})
          </button>

          <button
            onClick={() => setActiveSection("validation")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSection === "validation"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Validation Dépôts
            {pendingCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full ml-1">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection("gateways")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSection === "gateways"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Numéros Paiement ({gateways.length})
          </button>

          <button
            onClick={() => setActiveSection("routers")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSection === "routers"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            Parc Routeurs ({routers.length})
          </button>
        </div>
      </header>

      {/* Main Admin Body */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* SECTION 1 : TARIFS DES ACTIONS (PRIX MODIFIABLES UN PAR UN) */}
        {activeSection === "pricing" && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  Tarification des Actions Réseau (Chaque action est payante)
                </h2>
                <p className="text-xs text-slate-400">
                  Définissez le coût en StarCoins (SC) et Francs CFA débité sur le solde des clients pour chaque opération. <strong>Modifiable un par un.</strong>
                </p>
              </div>

              <button
                onClick={loadPricing}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 self-start"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Actualiser
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Code Action</th>
                    <th className="py-3 px-3">Nom de l&apos;Action</th>
                    <th className="py-3 px-3">Catégorie</th>
                    <th className="py-3 px-3">Prix en StarCoins (SC)</th>
                    <th className="py-3 px-3">Prix en FCFA (XOF)</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-3 text-right">Modifier le Prix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {pricingList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-amber-400">{item.code_action}</td>
                      <td className="py-3 px-3 font-sans font-bold text-white">{item.nom_action}</td>
                      <td className="py-3 px-3 font-sans">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                          {item.categorie || "Général"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400 text-sm">
                        {parseFloat(String(item.prix_sc)).toLocaleString()} SC
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-200">
                        {parseFloat(String(item.prix_cfa)).toLocaleString()} CFA
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.actif ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {item.actif ? "Actif" : "Désactivé"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-sans">
                        <button
                          onClick={() => {
                            setEditingAction(item);
                            setNewScPrice(parseFloat(String(item.prix_sc)));
                            setNewCfaPrice(parseFloat(String(item.prix_cfa)));
                          }}
                          className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition"
                        >
                          Changer le Prix
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2 : GESTION DES UTILISATEURS & ROLES */}
        {activeSection === "users" && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Gestion des Utilisateurs &amp; Rôles (Strictement &apos;admin&apos; et &apos;user&apos;)
                </h2>
                <p className="text-xs text-slate-400">
                  Attribuez ou révoquez les privilèges ADMIN en base de données, et ajustez directement les soldes StarCoins.
                </p>
              </div>

              <button
                onClick={loadUsers}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 self-start"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Actualiser
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">Nom</th>
                    <th className="py-3 px-3">Téléphone</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Rôle Actuel</th>
                    <th className="py-3 px-3">Solde StarCoin</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono text-slate-500">#{u.id}</td>
                      <td className="py-3 px-3 font-bold text-white">{u.nom}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{u.telephone}</td>
                      <td className="py-3 px-3 text-slate-400">{u.email || "—"}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            u.role === "admin"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-amber-400 font-mono">
                        {parseFloat(String(u.solde_starcoin)).toLocaleString()} SC
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setNewRole(u.role);
                            setNewSoldeSc(parseFloat(String(u.solde_starcoin)));
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                        >
                          Modifier Rôle / Solde
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3 : VALIDATION DES DÉPÔTS */}
        {activeSection === "validation" && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Validation des Dépôts Mobile Money ({transactions.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Vérifiez le reçu envoyé au Niger. En validant, le compte de l&apos;utilisateur est crédité automatiquement en StarCoins.
                </p>
              </div>

              <button
                onClick={loadTransactions}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Actualiser
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Client</th>
                    <th className="py-3 px-3">Moyen &amp; Numéro</th>
                    <th className="py-3 px-3">Montant FCFA</th>
                    <th className="py-3 px-3">Crédit SC</th>
                    <th className="py-3 px-3">Référence SMS</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{tx.user_nom || "Client"}</div>
                        <div className="text-[11px] text-slate-400">{tx.user_phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-200 font-semibold">{tx.methode_paiement}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{tx.numero_expediteur || "Non précisé"}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {parseFloat(String(tx.montant_cfa)).toLocaleString()} CFA
                      </td>
                      <td className="py-3 px-3 font-extrabold text-amber-300">
                        +{parseFloat(String(tx.montant_sc)).toLocaleString()} SC
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-200">{tx.reference_manuelle}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.statut === "valide"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : tx.statut === "en_attente"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {tx.statut.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {tx.statut === "en_attente" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleValidateTx(tx.id, "valide")}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow"
                            >
                              Valider (+SC)
                            </button>
                            <button
                              onClick={() => handleValidateTx(tx.id, "rejete")}
                              className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs rounded-lg"
                            >
                              Rejeter
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Traité</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        Aucune transaction enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 4 : NUMÉROS DE PAIEMENT */}
        {activeSection === "gateways" && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-400" />
              Numéros de Réception Mobile Money Niger (Airtel, Moov, Wave, Zamani, Alza)
            </h2>
            <p className="text-xs text-slate-400">
              Modifiez dynamiquement les numéros récepteurs affichés aux clients lors de leurs recharges de StarCoins.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {gateways.map((gw) => {
                const isEditing = editingGatewayId === gw.id;
                return (
                  <div key={gw.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                    {isEditing ? (
                      <div className="space-y-3">
                        <span className="font-bold text-amber-400 text-xs">{gw.nom_methode}</span>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-0.5">Numéro de Téléphone Récepteur</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-0.5">Nom du Bénéficiaire</label>
                          <input
                            type="text"
                            value={editBeneficiaire}
                            onChange={(e) => setEditBeneficiaire(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={() => setEditingGatewayId(null)}
                            className="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs rounded"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleSaveGateway(gw.id)}
                            disabled={isSavingGateway}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                          >
                            Sauvegarder
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-white text-sm">{gw.nom_methode}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                            {gw.statut}
                          </span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1 mb-3">
                          <div className="flex items-center gap-1.5 text-amber-300 font-mono font-bold">
                            <Phone className="w-3.5 h-3.5" />
                            {gw.numero_telephone_defaut}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Titulaire : <span className="text-slate-200">{gw.nom_beneficiaire}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingGatewayId(gw.id);
                            setEditPhone(gw.numero_telephone_defaut);
                            setEditBeneficiaire(gw.nom_beneficiaire);
                            setEditInstructions(gw.instructions || "");
                          }}
                          className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-amber-400" /> Modifier ce Numéro
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 5 : SUPERVISION ROUTEURS */}
        {activeSection === "routers" && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                  Supervision Globale de tous les Routeurs Réseau ({routers.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Vue d&apos;ensemble en temps réel de tous les routeurs physiques connectés à la plateforme.
                </p>
              </div>

              <button
                onClick={loadRouters}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Actualiser
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Routeur</th>
                    <th className="py-3 px-3">Propriétaire</th>
                    <th className="py-3 px-3">Token Unique</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-3">CPU</th>
                    <th className="py-3 px-3">Clients Hotspot</th>
                    <th className="py-3 px-3">Dernière Synchro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {routers.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-white">{r.nom_routeur}</td>
                      <td className="py-3 px-3 text-slate-300">{r.user_nom || `#${r.user_id}`}</td>
                      <td className="py-3 px-3 font-mono text-amber-300 text-[11px]">{r.identifiant_unique_token}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.statut_connexion === "en_ligne"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : r.statut_connexion === "non_installe"
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {r.statut_connexion}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold font-mono">{r.cpu_load}%</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{r.active_hotspot_users}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {r.derniere_synchro ? new Date(r.derniere_synchro).toLocaleString("fr-FR") : "Jamais"}
                      </td>
                    </tr>
                  ))}

                  {routers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        Aucun routeur dans le réseau pour l&apos;instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL : MODIFICATION DU PRIX D'UNE ACTION */}
      {editingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              Modifier le Prix : {editingAction.nom_action}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ce prix sera débité du solde StarCoins des clients à chaque exécution de cette action.
            </p>

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Prix en StarCoins (SC) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={newScPrice}
                  onChange={(e) => {
                    const sc = parseFloat(e.target.value) || 0;
                    setNewScPrice(sc);
                    setNewCfaPrice(sc * 50); // Auto parité 50 CFA = 1 SC
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Équivalent en Francs CFA (XOF)
                </label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={newCfaPrice}
                  onChange={(e) => {
                    const cfa = parseFloat(e.target.value) || 0;
                    setNewCfaPrice(cfa);
                    setNewScPrice(parseFloat((cfa / 50).toFixed(2)));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Parité officielle : 50 FCFA = 1 StarCoin (SC)</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAction(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrice}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow"
                >
                  {isSavingPrice ? "Enregistrement..." : "Enregistrer le Nouveau Prix"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : MODIFIER RÔLE OU SOLDE D'UN UTILISATEUR */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Gérer Utilisateur : {editingUser.nom}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Téléphone : <span className="font-mono text-slate-300">{editingUser.telephone}</span>
            </p>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Attribution du Rôle (Strictement &apos;admin&apos; ou &apos;user&apos;)
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="user">USER (Client régulier - Actions payantes)</option>
                  <option value="admin">ADMIN (Superviseur - Droits totaux &amp; Actions gratuites)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Solde StarCoin (Créditer ou Débiter en direct)
                </label>
                <input
                  type="number"
                  step="1"
                  value={newSoldeSc}
                  onChange={(e) => setNewSoldeSc(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Équivalent : {(newSoldeSc * 50).toLocaleString()} FCFA
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow"
                >
                  {isSavingUser ? "Mise à jour..." : "Appliquer en Base de Données"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
