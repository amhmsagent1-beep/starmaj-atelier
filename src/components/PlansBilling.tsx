"use client";

import React, { useState } from "react";
import { User } from "@/types";
import {
  Sparkles,
  Check,
  Zap,
  ShieldCheck,
  Wifi,
  Coins,
  ArrowRight,
} from "lucide-react";

interface PlansBillingProps {
  currentUser: User;
  onRefreshAll: () => void;
}

export const PlansBilling: React.FC<PlansBillingProps> = ({
  currentUser,
  onRefreshAll,
}) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Parité : 50 FCFA = 1 SC
  const plans = [
    {
      code: "wifi_basic",
      nom: "Plan WiFi Basic",
      prixSc: 150, // 7 500 CFA = 150 SC
      prixCfa: 7500,
      description: "Idéal pour les petites zones WiFi de quartier et boutiques",
      popular: false,
      features: [
        "15 routeurs MikroTik maximum",
        "Accès Mikhmon léger en ligne illimité",
        "1 configuration automatique IA (Prosper)",
        "2 routeurs inclus dans le Roaming",
        "Générateur de coupons thermique",
        "Règle anti-fraude 1 MAC/ticket",
      ],
    },
    {
      code: "wifi_pro",
      nom: "Plan WiFi Pro",
      prixSc: 300, // 15 000 CFA = 300 SC
      prixCfa: 15000,
      description: "Pour cybercafés, restaurants et opérateurs multi-spots",
      popular: true,
      features: [
        "25 routeurs MikroTik simultanés",
        "Jusqu'à 30 antennes/équipements locaux",
        "3 configurations automatiques IA",
        "4 routeurs inclus dans le Roaming",
        "Agrégation de lignes PCC (Multi-WAN)",
        "Mikhmon Core + Suivi des ventes temps réel",
        "Support technique WhatsApp",
      ],
    },
    {
      code: "installateur",
      nom: "Plan Installateur",
      prixSc: 800, // 40 000 CFA = 800 SC
      prixCfa: 40000,
      description: "Conçu pour les installateurs réseaux et intégrateurs pros",
      popular: false,
      features: [
        "50 routeurs MikroTik managés",
        "Équipements & antennes illimités",
        "7 configurations automatiques avancées",
        "Passerelles Mobile Money Niger incluses",
        "6 routeurs inclus en Roaming centralisé",
        "Tunnel VPN Haute Disponibilité 99%",
        "Support technique prioritaire 24/7",
      ],
    },
    {
      code: "aventurier",
      nom: "Plan Aventurier",
      prixSc: 1500, // 75 000 CFA = 1 500 SC
      prixCfa: 75000,
      description: "Toutes les fonctionnalités débloquées au maximum pour grands FAI",
      popular: false,
      features: [
        "Jusqu'à 100 routeurs MikroTik en simultané",
        "Équipements locaux illimités",
        "Configurations IA & réparations illimitées",
        "Roaming multi-zones illimité",
        "Toutes options débloquées au maximum",
        "Assistance ingénieur dédiée StarMaj",
      ],
    },
  ];

  const handleSubscribe = async (planCode: string) => {
    setLoadingPlan(planCode);
    try {
      const res = await fetch("/api/plans/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          planCode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        onRefreshAll();
      } else {
        alert(data.error || "Erreur de souscription");
      }
    } catch (e: any) {
      alert("Erreur de connexion : " + e.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const currentPlanCode = currentUser.plan_actuel || "aucun";
  const userSolde = parseFloat(String(currentUser.solde_starcoin));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Grille Tarifaire Mensuelle (Monnaie Virtuelle StarCoin - SC)
            </h2>
            <span className="bg-amber-500/10 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold">
              50 FCFA = 1 StarCoin (SC)
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Les fonds sont prélevés directement de votre solde en StarCoins (SC).
          </p>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-bold">Votre Solde Actuel</div>
            <div className="text-lg font-black text-amber-400 flex items-center gap-1">
              <Coins className="w-4 h-4 text-amber-400" />
              {userSolde.toLocaleString()} SC
            </div>
            <span className="text-[10px] text-slate-500 block">
              = {(userSolde * 50).toLocaleString()} FCFA
            </span>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((p) => {
          const isCurrent = currentPlanCode === p.code;
          const canAfford = userSolde >= p.prixSc;

          return (
            <div
              key={p.code}
              className={`bg-slate-900 rounded-2xl p-5 border flex flex-col justify-between transition-all duration-200 relative ${
                isCurrent
                  ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl shadow-emerald-500/10"
                  : p.popular
                  ? "border-amber-500/70 shadow-lg shadow-amber-500/10"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {p.popular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                  Plus Populaire
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                  Plan Actuel
                </div>
              )}

              <div>
                <h3 className="font-bold text-white text-base mt-1">{p.nom}</h3>
                <p className="text-slate-400 text-xs mt-1 min-h-[32px]">{p.description}</p>

                <div className="my-4 pb-4 border-b border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{p.prixSc.toLocaleString()}</span>
                    <span className="text-xs font-bold text-amber-400">SC / mois</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block font-semibold">
                    = {p.prixCfa.toLocaleString()} FCFA
                  </span>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-300 leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-800">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl"
                  >
                    Formule Active
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(p.code)}
                    disabled={loadingPlan === p.code}
                    className={`w-full py-2.5 font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5 ${
                      canAfford
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                    }`}
                  >
                    {loadingPlan === p.code ? (
                      "Activation..."
                    ) : canAfford ? (
                      <>
                        Activer avec mon Solde <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      "Solde Insuffisant (Recharger)"
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
