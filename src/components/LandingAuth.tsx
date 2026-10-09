"use client";

import React, { useState } from "react";
import { User } from "@/types";
import {
  Radio,
  Wifi,
  Coins,
  ShieldCheck,
  Cpu,
  Ticket,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  Lock,
  Globe,
  Sparkles,
  Layers,
  Zap,
  HelpCircle,
  Smartphone,
  ChevronRight,
  FileText,
  KeyRound,
} from "lucide-react";

interface LandingAuthProps {
  onLoginSuccess: (user: User) => void;
  onContinueAsGuest?: () => void;
}

export const LandingAuth: React.FC<LandingAuthProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  // Form states
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState(""); // Facultatif
  const [pays, setPays] = useState("Niger (+227)");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick switch between popular country codes
  const countryPresets = [
    { name: "Niger", code: "+227" },
    { name: "Côte d'Ivoire", code: "+225" },
    { name: "Sénégal", code: "+221" },
    { name: "Mali", code: "+223" },
    { name: "Burkina Faso", code: "+226" },
    { name: "Bénin", code: "+229" },
    { name: "Togo", code: "+228" },
    { name: "Cameroun", code: "+237" },
    { name: "Guinée", code: "+224" },
    { name: "International (Autre)", code: "+" },
  ];

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: authMode,
          nom: nom.trim(),
          telephone: telephone.trim(),
          email: email.trim() || undefined,
          motDePasse,
          pays,
        }),
      });

      // ROBUST JSON PARSING — use res.text() + try/catch to prevent
      // "Unexpected end of JSON input" when the response is empty/truncated.
      const text = await res.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : { success: false, error: "Réponse vide du serveur. Réessayez." };
      } catch {
        data = { success: false, error: `Erreur serveur (HTTP ${res.status}). Réessayez.` };
      }

      if (data.success && data.user) {
        setShowAuthModal(false);
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.error || "Une erreur est survenue lors de la connexion.");
      }
    } catch (err: any) {
      setErrorMsg("Erreur réseau : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">
                  STARMAJ <span className="text-amber-400">ATELIER</span>
                </span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                  CLOUD MIKROTIK
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Hotspot WiFi • Reconfiguration Auto • Mikhmon Intégré
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setAuthMode("login");
                setShowAuthModal(true);
              }}
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition"
            >
              Se Connecter
            </button>
            <button
              onClick={() => {
                setAuthMode("register");
                setShowAuthModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              Créer un Compte
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 overflow-hidden flex-1 flex flex-col justify-center items-center text-center">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-slate-900 border border-amber-500/30 rounded-full px-4 py-1.5 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Inscription Simple : <strong className="text-amber-400">Numéro de Téléphone Libre</strong> (Tous pays acceptés) • Email Facultatif
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Pilotez vos Routeurs MikroTik &amp; Portails Hotspot <span className="text-amber-400">depuis le Cloud</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Sans adresse IP publique ni redirection de port (traverse 100% le CGNAT). 
            Reconfiguration automatique à distance (DNS, portails captifs, profils de vitesse) et module Mikhmon léger intégré pour générer et imprimer vos tickets industriels.
          </p>

          {/* Call to actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setAuthMode("register");
                setShowAuthModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 transition transform hover:-translate-y-0.5"
            >
              <Smartphone className="w-4 h-4" />
              S&apos;inscrire avec son Numéro (50 SC Offerts)
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setAuthMode("login");
                setShowAuthModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-800 transition"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              Se Connecter à son Compte
            </button>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 text-left">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <Wifi className="w-5 h-5 text-amber-400 mb-2" />
              <div className="font-bold text-white text-xs">Reconfiguration Auto</div>
              <p className="text-[11px] text-slate-400 mt-0.5">DNS et portails captifs appliqués au routeur sans copier de script.</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <Ticket className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="font-bold text-white text-xs">Mikhmon Intégré</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Générateur de coupons par 50/100/500 et tickets thermiques prêts.</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <ShieldCheck className="w-5 h-5 text-indigo-400 mb-2" />
              <div className="font-bold text-white text-xs">Anti-Fraude Stricte</div>
              <p className="text-[11px] text-slate-400 mt-0.5">1 seule session active par appareil MAC et roaming multi-zones.</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <Coins className="w-5 h-5 text-amber-400 mb-2" />
              <div className="font-bold text-white text-xs">Fintech &amp; StarCoins</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Parité 50 CFA = 1 SC avec recharges Airtel, Moov, Zamani, Alza, Wave.</p>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL : INSCRIPTION & CONNEXION RAPIDE */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative my-6">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-sm font-mono px-2"
            >
              ✕
            </button>

            {/* Modal header */}
            <div className="text-center mb-6">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20 mb-3">
                <Radio className="w-6 h-6 text-slate-950" />
              </div>
              <h3 className="text-xl font-black text-white">
                {authMode === "register" ? "Créer un Compte StarMaj" : "Connexion à votre Atelier"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {authMode === "register"
                  ? "Saisie libre du numéro de téléphone (international tous pays). L'email est facultatif !"
                  : "Entrez votre numéro de téléphone et mot de passe pour accéder à votre espace."}
              </p>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl mb-4 text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nom &amp; Prénom ou Nom de l&apos;Établissement *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ibrahim Boubacar (WiFi Zone Niamey)"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Country Selection for code helper */}
              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pays de Résidence
                  </label>
                  <select
                    value={pays}
                    onChange={(e) => {
                      setPays(e.target.value);
                      const found = countryPresets.find((c) => e.target.value.includes(c.code));
                      if (found && found.code !== "+") {
                        if (!telephone.startsWith(found.code)) {
                          setTelephone(found.code + " ");
                        }
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {countryPresets.map((c, i) => (
                      <option key={i} value={`${c.name} (${c.code})`}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Phone number input - Free international format */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Numéro de Téléphone * <span className="text-[10px] text-amber-400 font-bold">(Saisie Libre Tous Pays)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="Ex: +227 90 12 34 56 ou +225 07..."
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-mono focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Email - Optional */}
              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Adresse Email <span className="text-slate-500 text-[10px] font-normal">(Facultatif)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      placeholder="votre-email@exemple.com (Optionnel)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mot de Passe *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
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

              {authMode === "register" && (
                <p className="text-[10px] text-slate-500 leading-tight pt-1">
                  En créant un compte, vous acceptez la politique d&apos;utilisation et bénéficiez d&apos;un crédit de bienvenue de <strong>50 SC (= 2 500 CFA)</strong> pour démarrer.
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-4"
              >
                {isSubmitting ? (
                  "Traitement en cours..."
                ) : authMode === "register" ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Créer Mon Compte Maintenant
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Connexion
                  </>
                )}
              </button>
            </form>

            {/* Toggle switch between login and register */}
            <div className="mt-5 text-center text-xs text-slate-400 border-t border-slate-800 pt-4">
              {authMode === "register" ? (
                <>
                  Vous possédez déjà un compte ?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setErrorMsg("");
                    }}
                    className="text-amber-400 hover:underline font-bold"
                  >
                    Connectez-vous ici
                  </button>
                </>
              ) : (
                <>
                  Pas encore de compte ?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("register");
                      setErrorMsg("");
                    }}
                    className="text-amber-400 hover:underline font-bold"
                  >
                    Inscrivez-vous en 30 secondes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-6 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>STARMAJ ATELIER • Gestion Cloud MikroTik &amp; Mikhmon Intégré</span>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-mono">
              Parité Officielle : 50 FCFA = 1 StarCoin (SC)
            </span>
            <span>•</span>
            <a href="/admin" className="text-amber-400 hover:text-amber-300 font-bold underline">
              Portail Administrateur (/admin)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
