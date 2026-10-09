"use client";

import React, { useState, useEffect } from "react";
import { User, PaymentGateway, Transaction } from "@/types";
import {
  Coins,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Edit2,
  Save,
  Send,
  AlertCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
  Smartphone,
  Wallet,
  Lock,
} from "lucide-react";

interface FintechWalletsProps {
  currentUser: User;
  onRefreshAll: () => void;
}

export const FintechWallets: React.FC<FintechWalletsProps> = ({
  currentUser,
  onRefreshAll,
}) => {
  // Server-side database verified admin status
  const [serverAdminVerified, setServerAdminVerified] = useState<boolean>(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(true);

  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // User Deposit Form state
  const [selectedGatewayId, setSelectedGatewayId] = useState<number | null>(null);
  const [montantCfa, setMontantCfa] = useState<number>(5000); // 5000 CFA = 100 SC
  const [numeroExpediteur, setNumeroExpediteur] = useState(currentUser.telephone || "+227 ");
  const [referenceManuelle, setReferenceManuelle] = useState("");
  const [captureEcranUrl, setCaptureEcranUrl] = useState("");
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Admin Gateway Editor state
  const [editingGatewayId, setEditingGatewayId] = useState<number | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editBeneficiaire, setEditBeneficiaire] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editStatut, setEditStatut] = useState<"actif" | "inactif">("actif");
  const [isSavingGateway, setIsSavingGateway] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>("en_attente");

  // Verify directly against backend server and database
  const verifyServerAuth = async () => {
    setIsVerifyingAuth(true);
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      const isAdminInDb = Boolean(data.authenticated && data.user?.role === "admin");
      setServerAdminVerified(isAdminInDb);
    } catch {
      setServerAdminVerified(false);
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const fetchGateways = async () => {
    try {
      const res = await fetch("/api/gateways");
      const data = await res.json();
      if (data.success) {
        setGateways(data.gateways);
        if (data.gateways.length > 0 && selectedGatewayId === null) {
          setSelectedGatewayId(data.gateways[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async (adminStatus: boolean) => {
    try {
      const url = adminStatus
        ? `/api/transactions?isAdmin=true&status=${statusFilter}`
        : `/api/transactions?userId=${currentUser.id}&status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        const isAdminInDb = Boolean(data.authenticated && data.user?.role === "admin");
        if (isMounted) {
          setServerAdminVerified(isAdminInDb);
          setIsVerifyingAuth(false);
          fetchGateways();
          fetchTransactions(isAdminInDb);
        }
      } catch {
        if (isMounted) {
          setServerAdminVerified(false);
          setIsVerifyingAuth(false);
          fetchGateways();
          fetchTransactions(false);
        }
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [currentUser.id, statusFilter]);

  const handleUserDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGatewayId || !montantCfa) return;

    const gateway = gateways.find((g) => g.id === selectedGatewayId);
    if (!gateway) return;

    setIsSubmittingDeposit(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          type: "depot",
          montantCfa,
          methodePaiement: gateway.nom_methode,
          numeroExpediteur,
          referenceManuelle: referenceManuelle || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
          captureEcranUrl: captureEcranUrl || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(
          `Demande de dépôt enregistrée avec succès !\n\nMontant : ${montantCfa} CFA\nCrédit attendu : ${data.montantSc} SC (Parité: 50 CFA = 1 SC)\nTransmis à l'administrateur pour vérification.`
        );
        setReferenceManuelle("");
        fetchTransactions(serverAdminVerified);
        onRefreshAll();
      } else {
        alert(data.error || "Erreur de soumission");
      }
    } catch (err: any) {
      alert("Erreur réseau : " + err.message);
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  /**
   * Validation by Admin: calls secure /api/validation endpoint.
   * Strictly enforces ADMIN role verified in PostgreSQL database.
   */
  const handleAdminValidation = async (transactionId: number, decision: "valide" | "rejete") => {
    try {
      const res = await fetch("/api/validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          decision,
          commentaireAdmin:
            decision === "valide"
              ? "Validé par administrateur certifié (Parité: 50 CFA = 1 SC)"
              : "Refusé : Référence introuvable sur relevé opérateur",
        }),
      });

      const data = await res.json();
      if (res.status === 403) {
        alert("⛔ ACCÈS REFUSÉ (403 Forbidden) : Votre compte ne possède pas les privilèges ADMIN en base de données.");
        return;
      }

      if (data.success) {
        alert(data.message);
        fetchTransactions(serverAdminVerified);
        onRefreshAll();
      } else {
        alert(data.error || "Erreur lors du traitement");
      }
    } catch (e: any) {
      alert("Erreur : " + e.message);
    }
  };

  const startEditGateway = (gw: PaymentGateway) => {
    setEditingGatewayId(gw.id);
    setEditPhone(gw.numero_telephone_defaut);
    setEditBeneficiaire(gw.nom_beneficiaire);
    setEditInstructions(gw.instructions);
    setEditStatut(gw.statut);
  };

  /**
   * Modifying payment gateway numbers: guarded by requireAdmin in backend.
   */
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
          statut: editStatut,
        }),
      });

      if (res.status === 403) {
        alert("⛔ ACCÈS REFUSÉ (403 Forbidden) : Rôle ADMIN requis en base de données pour modifier les numéros récepteurs.");
        setIsSavingGateway(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setEditingGatewayId(null);
        fetchGateways();
        alert("Numéro et paramètres de paiement mis à jour en direct !");
      } else {
        alert(data.error || "Erreur sauvegarde");
      }
    } catch (e: any) {
      alert("Erreur : " + e.message);
    } finally {
      setIsSavingGateway(false);
    }
  };

  const selectedGateway = gateways.find((g) => g.id === selectedGatewayId);
  const calculatedScFromInput = (montantCfa / 50).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              {serverAdminVerified
                ? "Fintech Niger & Validation Administrateur (Sécurisé)"
                : "Portefeuille & Achat de StarCoins (SC)"}
            </h2>
            <span className="bg-amber-500/10 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold">
              50 FCFA = 1 StarCoin (SC)
            </span>
            {serverAdminVerified && (
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Session Admin Certifiée BD
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {serverAdminVerified
              ? "Supervision des passerelles de paiement (Airtel, Moov, Alza, Zamani, Wave) et validation manuelle des dépôts avec contrôle d'accès strict."
              : "Rechargez votre solde StarCoin en effectuant votre transfert Mobile Money au Niger puis soumettez votre référence."}
          </p>
        </div>

        {/* Filter dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filtrer transactions :</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-white"
          >
            <option value="tous">Toutes</option>
            <option value="en_attente">En Attente</option>
            <option value="valide">Validées</option>
            <option value="rejete">Rejetées</option>
          </select>
        </div>
      </div>

      {/* SENSITIVE ADMIN SECTION : ONLY RENDERED IF AUTHENTICATED ADMIN VERIFIED IN DB */}
      {serverAdminVerified && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                Gestion Dynamique des Numéros de Paiement (Mobile Money Niger)
              </h3>
              <p className="text-xs text-slate-400">
                Protégé côté serveur : Seul l&apos;administrateur authentifié en base de données peut modifier ces paramètres.
              </p>
            </div>
            <button
              onClick={fetchGateways}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gateways.map((gw) => {
              const isEditing = editingGatewayId === gw.id;
              return (
                <div
                  key={gw.id}
                  className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <span className="font-bold text-amber-400 text-xs">{gw.nom_methode}</span>
                      </div>
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
                        <label className="text-[11px] text-slate-400 block mb-0.5">Nom Bénéficiaire / Marchand</label>
                        <input
                          type="text"
                          value={editBeneficiaire}
                          onChange={(e) => setEditBeneficiaire(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-0.5">Instructions Client</label>
                        <textarea
                          rows={2}
                          value={editInstructions}
                          onChange={(e) => setEditInstructions(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-0.5">Statut</label>
                        <select
                          value={editStatut}
                          onChange={(e) => setEditStatut(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          <option value="actif">Actif (Visible)</option>
                          <option value="inactif">Inactif (Masqué)</option>
                        </select>
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
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Sauvegarder
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-white text-sm">{gw.nom_methode}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            gw.statut === "actif"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-slate-700 text-slate-400"
                          }`}
                        >
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
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{gw.instructions}</p>
                      </div>

                      <button
                        onClick={() => startEditGateway(gw)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                      >
                        <Edit2 className="w-3 h-3 text-emerald-400" />
                        Modifier le Numéro
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* USER SECTION : RECHARGE DE CRÉDIT STARCOIN */}
      {!serverAdminVerified && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-400" />
              Acheter des StarCoins (SC)
            </h3>
            <p className="text-xs text-slate-400">
              Choisissez votre opérateur au Niger, effectuez le transfert vers le numéro indiqué puis soumettez votre preuve.
            </p>

            <form onSubmit={handleUserDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Moyen de Paiement *</label>
                <select
                  value={selectedGatewayId || ""}
                  onChange={(e) => setSelectedGatewayId(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {gateways
                    .filter((g) => g.statut === "actif")
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nom_methode}
                      </option>
                    ))}
                </select>
              </div>

              {selectedGateway && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 uppercase font-bold">Numéro à Créditer :</span>
                    <span className="text-emerald-400 text-[10px] font-semibold">Configuré par Admin</span>
                  </div>
                  <div className="text-sm font-black font-mono text-amber-300 bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                    {selectedGateway.numero_telephone_defaut}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Bénéficiaire : <strong>{selectedGateway.nom_beneficiaire}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/50 p-2 rounded">
                    {selectedGateway.instructions}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Montant en FCFA *</label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  required
                  value={montantCfa}
                  onChange={(e) => setMontantCfa(parseFloat(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                />
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 mt-2 text-xs">
                  <span className="text-slate-400 block text-[11px]">Crédit StarCoins calculé :</span>
                  <div className="text-base font-black text-emerald-400 mt-0.5">
                    {calculatedScFromInput} SC
                  </div>
                  <span className="text-[10px] text-slate-500 block">Taux officiel : 50 FCFA = 1 StarCoin</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Votre Numéro Expéditeur</label>
                <input
                  type="text"
                  placeholder="+227 96 00 00 00"
                  value={numeroExpediteur}
                  onChange={(e) => setNumeroExpediteur(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Référence / Code SMS Transfert</label>
                <input
                  type="text"
                  placeholder="Ex: AM-202505-8819 ou Flooz ref"
                  value={referenceManuelle}
                  onChange={(e) => setReferenceManuelle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingDeposit}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                {isSubmittingDeposit ? "Envoi en cours..." : "Soumettre la Preuve de Dépôt"}
              </button>
            </form>
          </div>

          {/* User History */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                Historique de vos Recharges StarCoins
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Dès que l&apos;administrateur StarMaj valide votre transfert, vos StarCoins (SC) sont crédités instantanément.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Moyen</th>
                      <th className="py-2.5 px-3">Montant FCFA</th>
                      <th className="py-2.5 px-3">Crédit SC</th>
                      <th className="py-2.5 px-3">Référence</th>
                      <th className="py-2.5 px-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(tx.date_transaction).toLocaleString("fr-FR")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{tx.methode_paiement}</td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {parseFloat(String(tx.montant_cfa)).toLocaleString()} CFA
                        </td>
                        <td className="py-2.5 px-3 font-bold text-amber-300">
                          +{parseFloat(String(tx.montant_sc)).toLocaleString()} SC
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{tx.reference_manuelle}</td>
                        <td className="py-2.5 px-3">
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
                      </tr>
                    ))}

                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500">
                          Aucune transaction effectuée.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SENSITIVE ADMIN VALIDATION QUEUE : ONLY ACCESSIBLE IF SERVER AUTHENTICATED AS ADMIN */}
      {serverAdminVerified && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-amber-400" />
                File d&apos;Attente des Dépôts Manuels ({transactions.length})
              </h3>
              <p className="text-xs text-slate-400">
                Protégé par contrôle d&apos;accès strict serveur (Back-end) : Cliquez sur &quot;Valider&quot; pour créditer le client en StarCoins.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Moyen &amp; Expéditeur</th>
                  <th className="py-2.5 px-3">Montant CFA</th>
                  <th className="py-2.5 px-3">Crédit SC</th>
                  <th className="py-2.5 px-3">Référence Reçu</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3 text-right">Actions Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white">{tx.user_nom || "Client"}</div>
                      <div className="text-[11px] text-slate-400">{tx.user_email || tx.user_phone}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-200 font-semibold">{tx.methode_paiement}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{tx.numero_expediteur || "Non précisé"}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white">
                        {parseFloat(String(tx.montant_cfa)).toLocaleString()} CFA
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-extrabold text-amber-300">
                        +{parseFloat(String(tx.montant_sc)).toLocaleString()} SC
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{tx.reference_manuelle}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(tx.date_transaction).toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2.5 px-3">
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
                    <td className="py-2.5 px-3 text-right">
                      {tx.statut === "en_attente" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAdminValidation(tx.id, "valide")}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition"
                          >
                            Valider (+SC)
                          </button>
                          <button
                            onClick={() => handleAdminValidation(tx.id, "rejete")}
                            className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs rounded-lg transition"
                          >
                            Rejeter
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          {tx.validateur_nom ? `Validé par ${tx.validateur_nom}` : "Traité"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      Aucune transaction dans cette file.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
