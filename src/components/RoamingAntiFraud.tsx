"use client";

import React, { useState } from "react";
import { User, RouterItem, RoamingZone, WifiTicket } from "@/types";
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Wifi,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Radio,
  Lock,
} from "lucide-react";

interface RoamingAntiFraudProps {
  currentUser: User;
  routers: RouterItem[];
  roamingZones: RoamingZone[];
  tickets: WifiTicket[];
  onRefresh: () => void;
}

export const RoamingAntiFraud: React.FC<RoamingAntiFraudProps> = ({
  currentUser,
  routers,
  roamingZones,
  tickets,
  onRefresh,
}) => {
  // Test Sandbox state
  const [testTicketCode, setTestTicketCode] = useState(tickets[0]?.code_ticket || "");
  const [testMac, setTestMac] = useState("48:2C:6A:11:8A:F2");
  const [testRouterId, setTestRouterId] = useState<string>(routers[0]?.id?.toString() || "");
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // New Zone state
  const [nomZone, setNomZone] = useState("");
  const [description, setDescription] = useState("");
  const [isCreatingZone, setIsCreatingZone] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/mikhmon/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeTicket: testTicketCode,
          deviceMac: testMac,
          targetRouterId: testRouterId ? parseInt(testRouterId, 10) : undefined,
        }),
      });

      const data = await res.json();
      setTestResult(data);
      onRefresh();
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomZone.trim()) return;

    setIsCreatingZone(true);
    try {
      const res = await fetch("/api/roaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          nomZone,
          description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNomZone("");
        setDescription("");
        alert("Zone de roaming créée avec succès !");
        onRefresh();
      } else {
        alert(data.error || "Erreur de création");
      }
    } catch (e: any) {
      alert("Erreur : " + e.message);
    } finally {
      setIsCreatingZone(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Roaming Multi-Zones & Règle Anti-Fraude Stricte
            </h2>
            <span className="bg-emerald-500/10 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
              Shared-Users = 1 (Zero-Leak)
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Permet à un coupon créé sur le routeur A d&apos;être utilisé sur le routeur B de la même zone, tout en bloquant rigoureusement le partage simultané à plusieurs appareils.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sandbox Anti-Fraude Test Terminal */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            Simulateur d&apos;Authentification & Test Anti-Fraude
          </h3>
          <p className="text-xs text-slate-400">
            Testez la tentative d&apos;authentification d&apos;un client Hotspot avec son code ticket et l&apos;adresse MAC de son smartphone.
          </p>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Code Ticket à Tester *</label>
              <input
                type="text"
                value={testTicketCode}
                onChange={(e) => setTestTicketCode(e.target.value.toUpperCase())}
                placeholder="Ex: SM-7821-K9"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Adresse MAC du Client *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testMac}
                  onChange={(e) => setTestMac(e.target.value)}
                  placeholder="48:2C:6A:11:8A:F2"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setTestMac("B4:8C:9D:44:09:12")}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-xl border border-slate-700 font-mono"
                >
                  MAC Frauduleuse (Appareil B)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Routeur MikroTik Tentative</label>
              <select
                value={testRouterId}
                onChange={(e) => setTestRouterId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom_routeur} ({r.nom_zone || "Zone Locale"})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isTesting ? "Contrôle en cours..." : "Simuler la Connexion (Consommation & Suppression Auto)"}
            </button>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 transition-all ${
                testResult.success
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Coupon Consommé &amp; Supprimé du Serveur et du Routeur !
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Tentative Rejetée par StarMaj
                  </>
                )}
              </div>
              <p className="text-xs">{testResult.message || testResult.error}</p>
              {testResult.statutServeur && (
                <p className="text-[11px] font-mono text-emerald-300">
                  • Serveur : {testResult.statutServeur}
                </p>
              )}
              {testResult.statutRouteur && (
                <p className="text-[11px] font-mono text-amber-300">
                  • Routeur : {testResult.statutRouteur}
                </p>
              )}
              {testResult.statutComptable && (
                <p className="text-[11px] font-mono text-indigo-300">
                  • Comptabilité : {testResult.statutComptable}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Roaming Zones List & Creator */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Radio className="w-5 h-5 text-indigo-400" />
              Zones de Roaming Actives
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Les routeurs d&apos;une même zone partagent la validité de leurs tickets Hotspot.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin">
              {roamingZones.map((zone) => (
                <div
                  key={zone.id}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{zone.nom_zone}</span>
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      {zone.routers_count || 0} routeurs liés
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">{zone.description || "Aucune description"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* New Zone Form */}
          <form onSubmit={handleCreateZone} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              Créer une Nouvelle Zone de Roaming
            </h4>

            <div>
              <input
                type="text"
                required
                placeholder="Nom de la zone (ex: Campus Universitaire Niamey)"
                value={nomZone}
                onChange={(e) => setNomZone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Description / localisation"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingZone}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition"
            >
              {isCreatingZone ? "Création..." : "Ajouter la Zone de Roaming"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
