import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";

export async function GET(request: NextRequest) {
  return handleHeartbeat(request);
}

export async function POST(request: NextRequest) {
  return handleHeartbeat(request);
}

async function handleHeartbeat(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const cpu = parseInt(url.searchParams.get("cpu") || "0", 10);
  const uptime = url.searchParams.get("uptime") || "0d 00h 00m";
  const memFree = parseInt(url.searchParams.get("mem") || "128", 10);
  const rosVersion = url.searchParams.get("ver") || "v7.14";
  const activeUsers = parseInt(url.searchParams.get("users") || "0", 10);
  const alertStatus = url.searchParams.get("alert") || "normal";
  const clientMac = url.searchParams.get("mac") || "";

  // Get client IP
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

  if (!token) {
    const errorRsc = `# STARMAJ ATELIER - ERREUR
:log error "[StarMaj] Requete /tool fetch rejetee : Parametre 'token' manquant";
# Ordre : Aucun
`;
    return new Response(errorRsc, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const client = await pool.connect();
  try {
    // 1. Look up router by token
    const routerRes = await client.query(
      `SELECT r.*, u.nom as user_nom, z.nom_zone, t.nom_etablissement, t.theme_couleur
       FROM routers r 
       LEFT JOIN users u ON u.id = r.user_id 
       LEFT JOIN roaming_zones z ON z.id = r.roaming_zone_id 
       LEFT JOIN captive_templates t ON t.id = r.captive_template_id
       WHERE r.identifiant_unique_token = $1`,
      [token]
    );

    if (routerRes.rows.length === 0) {
      const unauthRsc = `# STARMAJ ATELIER - ROUTEUR NON RECONNU
:log error "[StarMaj] Token invalide ou routeur supprime : ${token}";
:log warning "[StarMaj] Verifiez votre identifiant unique sur https://starmaj.atelier";
`;
      return new Response(unauthRsc, {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const router = routerRes.rows[0];

    // 2. Update router status
    await client.query(
      `UPDATE routers 
       SET statut_connexion = 'en_ligne',
           ip_publique = $1,
           cpu_load = $2,
           uptime = $3,
           ram_free_mb = $4,
           version_routeros = $5,
           active_hotspot_users = $6,
           derniere_synchro = NOW()
       WHERE id = $7`,
      [clientIp, cpu, uptime, memFree, rosVersion, activeUsers, router.id]
    );

    // 3. Build RouterOS Commands Output (Plain Text)
    const commands: string[] = [];
    let actionTaken = "heartbeat_synced";

    const timestamp = new Date().toISOString();
    commands.push(`# ========================================================`);
    commands.push(`# STARMAJ ATELIER - ORDRES D'EXECUTION AUTOMATIQUE ROUTEROS`);
    commands.push(`# Routeur: ${router.nom_routeur} | Token: ${token}`);
    commands.push(`# Timestamp: ${timestamp} | IP: ${clientIp}`);
    commands.push(`# ========================================================`);
    commands.push(`:log info "[StarMaj] Heartbeat synchronise avec succes (CPU: ${cpu}%, Users: ${activeUsers})";`);

    // Anti-Fraud enforcement: 1 active user device per ticket
    commands.push(`# [SECURITE ANTI-FRAUDE STRICTE : 1 SEUL APPAREIL PAR TICKET]`);
    commands.push(`/ip hotspot user profile set [find] shared-users=1;`);

    // Reconfiguration automatique transparente des DNS
    const dns1 = router.dns_primaire || "1.1.1.1";
    const dns2 = router.dns_secondaire || "8.8.8.8";
    const domain = router.dns_nom_domaine || "starmaj.hotspot";
    commands.push(`# [DNS DYNAMIQUES & PORTAIL CAPTIF CONFIGURÉS EN LIGNE]`);
    commands.push(`/ip dns set servers=${dns1},${dns2} allow-remote-requests=yes;`);

    // Recuperation dynamique des seuils d'auto-guerison et anti-fraude depuis admin_settings PostgreSQL
    const settingsRes = await client.query(
      `SELECT cle_configuration, valeur_configuration FROM admin_settings WHERE cle_configuration IN ('auto_healing_cpu_threshold', 'anti_fraud_max_mac')`
    );
    const settingsMap: Record<string, string> = {};
    settingsRes.rows.forEach((s: any) => {
      settingsMap[s.cle_configuration] = s.valeur_configuration;
    });
    const cpuThreshold = parseInt(settingsMap["auto_healing_cpu_threshold"] || "85", 10);
    const maxSharedMac = parseInt(settingsMap["anti_fraud_max_mac"] || "1", 10);

    // Enforcement dynamique : Règle anti-fraude (1 MAC) + Suppression automatique directe des tickets consommés sur le routeur
    commands.push(`# [ANTI-FRAUDE STRICTE & SUPPRESSION AUTOMATIQUE DES TICKETS CONSOMMÉS DU ROUTEUR]`);
    commands.push(`/ip hotspot user profile set [find] shared-users=${maxSharedMac} on-logout="/ip hotspot user remove [find name=\\$user]; /ip hotspot cookie remove [find user=\\$user];";`);

    // Sophia/Prosper IA self-healing engine avec prise de decision instantanee (Zero-Touch)
    if (router.auto_repair_enabled) {
      if (cpu >= cpuThreshold) {
        actionTaken = "auto_repair_cpu_spike";
        commands.push(`:log warning "[StarMaj IA] Charge processeur anormale detectee (${cpu}% >= ${cpuThreshold}%). Nettoyage dynamique en RAM...";`);
        commands.push(`/ip dns cache flush;`);
        commands.push(`/system logging action set 0 memory-lines=100;`);
        commands.push(`/ip hotspot active remove [find uptime>12h and bytes-in<10000];`);
      } else if (alertStatus === "dns_fail") {
        actionTaken = "auto_repair_dns";
        commands.push(`:log warning "[StarMaj IA] Resolution panne DNS detectee. Reconfiguration DNS securises (${dns1} & ${dns2})...";`);
        commands.push(`/ip dns set servers=${dns1},${dns2} allow-remote-requests=yes cache-size=4096KiB;`);
        commands.push(`/ip dns cache flush;`);
      } else if (alertStatus === "iface_down") {
        actionTaken = "auto_repair_interface";
        commands.push(`:log warning "[StarMaj IA] Rebounce automatique de l interface Hotspot...";`);
        commands.push(`/interface ethernet disable [find default-name=ether2];`);
        commands.push(`:delay 2s;`);
        commands.push(`/interface ethernet enable [find default-name=ether2];`);
      }
    }

    // Pending script execution (e.g. newly added batch tickets or automatic DNS/portal reconfiguration)
    if (router.script_pending && router.script_pending.trim().length > 0) {
      actionTaken = actionTaken + "_with_pending_orders";
      commands.push(`# [INJECTION DES ORDRES EN ATTENTE / RECONFIGURATION AUTO / TICKETS]`);
      commands.push(router.script_pending.trim());
      
      // Clear pending script
      await client.query(
        `UPDATE routers SET script_pending = NULL WHERE id = $1`,
        [router.id]
      );
    }

    // End marker
    commands.push(`# [FIN DES ORDRES STARMAJ]`);
    commands.push(`:log info "[StarMaj] Traitement termine - Prochain appel planifie";`);

    const finalScript = commands.join("\n") + "\n";

    // 4. Log the heartbeat event
    await client.query(
      `INSERT INTO router_heartbeat_logs 
       (router_id, token, ip_client, cpu_load, uptime, action_prise, commandes_repondues, statut_alerte)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        router.id,
        token,
        clientIp,
        cpu,
        uptime,
        actionTaken,
        finalScript.substring(0, 1000),
        alertStatus,
      ]
    );

    return new Response(finalScript, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-StarMaj-Router": router.nom_routeur,
      },
    });
  } catch (error: any) {
    console.error("Error handling heartbeat:", error);
    return new Response(
      `# STARMAJ SERVER ERROR\n:log error "[StarMaj] Erreur serveur interne : ${error?.message || "Erreur"}"\n`,
      {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  } finally {
    client.release();
  }
}
