import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { authenticateUser } from "@/lib/auth";
import { chargeUserForAction } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const wantsAdmin = url.searchParams.get("isAdmin") === "true";

  const sessionUser = await authenticateUser(request);
  const isVerifiedAdmin = sessionUser?.role === "admin";

  const client = await pool.connect();
  try {
    let query = `
      SELECT r.*, u.nom as user_nom, u.email as user_email, z.nom_zone,
             t.titre as template_titre, t.nom_etablissement, t.theme_couleur
      FROM routers r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN roaming_zones z ON z.id = r.roaming_zone_id
      LEFT JOIN captive_templates t ON t.id = r.captive_template_id
    `;
    const params: any[] = [];

    // If user is not verified as admin in DB, strictly restrict to their own routers
    if (!isVerifiedAdmin) {
      const filterId = sessionUser ? sessionUser.id : (userId ? parseInt(userId, 10) : -1);
      query += ` WHERE r.user_id = $1`;
      params.push(filterId);
    } else if (!wantsAdmin && userId) {
      query += ` WHERE r.user_id = $1`;
      params.push(parseInt(userId, 10));
    }

    query += ` ORDER BY r.derniere_synchro DESC NULLS LAST, r.id DESC`;

    const result = await client.query(query, params);
    const now = Date.now();

    // Calcul 100% réel de l'état de connexion :
    // - Si aucune synchronisation reçue : statut = "non_installe" (Installation requise sur le routeur physique)
    // - Si le heartbeat a été reçu il y a moins de 4 minutes : statut = "en_ligne" (Opérationnel)
    // - Si le heartbeat n'a pas été reçu depuis plus de 4 minutes : statut = "hors_ligne" (Déconnecté)
    const routersReal = result.rows.map((r: any) => {
      let realStatus: "en_ligne" | "hors_ligne" | "non_installe" = "non_installe";
      let minutesAgo: number | null = null;
      let installationRequise = true;

      if (r.derniere_synchro) {
        const diffMs = now - new Date(r.derniere_synchro).getTime();
        minutesAgo = Math.floor(diffMs / 60000);
        if (diffMs <= 4 * 60 * 1000) {
          realStatus = "en_ligne";
          installationRequise = false;
        } else {
          realStatus = "hors_ligne";
          installationRequise = false;
        }
      } else {
        realStatus = "non_installe";
        installationRequise = true;
      }

      return {
        ...r,
        statut_connexion: realStatus,
        installation_requise: installationRequise,
        minutes_depuis_synchro: minutesAgo,
      };
    });

    return NextResponse.json({ success: true, routers: routersReal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    userId,
    nomRouteur,
    token: customToken,
    identifiantUniqueToken,
    modele,
    versionRouteros,
    ipLocale,
    dnsPrimaire = "1.1.1.1",
    dnsSecondaire = "8.8.8.8",
    dnsNomDomaine = "starmaj.hotspot",
    hotspotInterface = "bridge-hotspot",
    roamingZoneId,
    captiveTemplateId,
    autoRepairEnabled,
    pccEnabled,
    pccLinesCount,
  } = body;

  if (!userId || !nomRouteur) {
    return NextResponse.json({ success: false, error: "Nom du routeur et utilisateur requis" }, { status: 400 });
  }

  const userSpecifiedToken = (identifiantUniqueToken || customToken || "").trim();
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const token = userSpecifiedToken || `SM-RTR-${Date.now().toString().slice(-4)}-${randomSuffix}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Charge action price in StarCoins
    const charge = await chargeUserForAction(client, parseInt(userId, 10), "add_router");
    if (!charge.success) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: charge.error }, { status: 402 });
    }

    const result = await client.query(
      `INSERT INTO routers 
       (user_id, nom_routeur, identifiant_unique_token, version_routeros, ip_locale, dns_primaire, dns_secondaire, dns_nom_domaine, hotspot_interface, modele, roaming_zone_id, captive_template_id, auto_repair_enabled, pcc_enabled, pcc_lines_count, statut_connexion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'hors_ligne')
       RETURNING *`,
      [
        userId,
        nomRouteur,
        token,
        versionRouteros || "v7.14",
        ipLocale || "192.168.88.1",
        dnsPrimaire,
        dnsSecondaire,
        dnsNomDomaine,
        hotspotInterface,
        modele || "MikroTik hAP / hEX",
        roamingZoneId ? parseInt(roamingZoneId, 10) : null,
        captiveTemplateId ? parseInt(captiveTemplateId, 10) : null,
        autoRepairEnabled !== false,
        pccEnabled === true,
        pccLinesCount ? parseInt(pccLinesCount, 10) : 2,
      ]
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true, router: result.rows[0], debiteSc: charge.prixSc });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const {
    id,
    nomRouteur,
    dnsPrimaire,
    dnsSecondaire,
    dnsNomDomaine,
    captiveTemplateId,
    autoRepairEnabled,
    pccEnabled,
    pccLinesCount,
    roamingZoneId,
    scriptToAppend,
    simulateAction,
    autoDeployConfig, // when user modifies DNS or captive portal, automatically push config to router queue!
  } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: "ID routeur manquant" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    let query = `UPDATE routers SET `;
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (nomRouteur !== undefined) {
      updates.push(`nom_routeur = $${paramIndex++}`);
      params.push(nomRouteur);
    }
    if (body.identifiantUniqueToken !== undefined || body.token !== undefined) {
      const newToken = (body.identifiantUniqueToken || body.token || "").trim();
      if (newToken) {
        updates.push(`identifiant_unique_token = $${paramIndex++}`);
        params.push(newToken);
      }
    }
    if (dnsPrimaire !== undefined) {
      updates.push(`dns_primaire = $${paramIndex++}`);
      params.push(dnsPrimaire);
    }
    if (dnsSecondaire !== undefined) {
      updates.push(`dns_secondaire = $${paramIndex++}`);
      params.push(dnsSecondaire);
    }
    if (dnsNomDomaine !== undefined) {
      updates.push(`dns_nom_domaine = $${paramIndex++}`);
      params.push(dnsNomDomaine);
    }
    if (captiveTemplateId !== undefined) {
      updates.push(`captive_template_id = $${paramIndex++}`);
      params.push(captiveTemplateId ? parseInt(captiveTemplateId, 10) : null);
    }
    if (autoRepairEnabled !== undefined) {
      updates.push(`auto_repair_enabled = $${paramIndex++}`);
      params.push(autoRepairEnabled);
    }
    if (pccEnabled !== undefined) {
      updates.push(`pcc_enabled = $${paramIndex++}`);
      params.push(pccEnabled);
    }
    if (pccLinesCount !== undefined) {
      updates.push(`pcc_lines_count = $${paramIndex++}`);
      params.push(pccLinesCount);
    }
    if (roamingZoneId !== undefined) {
      updates.push(`roaming_zone_id = $${paramIndex++}`);
      params.push(roamingZoneId ? parseInt(roamingZoneId, 10) : null);
    }

    // Auto-generate RouterOS commands to push over /tool fetch automatically!
    let generatedOrderScript = "";
    let autoSteps: string[] = [];

    if (body.autoBootstrap) {
      // OpTiNet-style full auto-configuration
      const rOwnerRes = await client.query("SELECT user_id FROM routers WHERE id = $1", [id]);
      if (rOwnerRes.rows.length > 0) {
        const ownerId = rOwnerRes.rows[0].user_id;
        const charge = await chargeUserForAction(client, ownerId, "auto_bootstrap");
        if (!charge.success) {
          return NextResponse.json({ success: false, error: charge.error }, { status: 402 });
        }
      }

      const dns1 = dnsPrimaire || "1.1.1.1";
      const dns2 = dnsSecondaire || "8.8.8.8";
      const domain = dnsNomDomaine || "starmaj.hotspot";

      generatedOrderScript = `
# INITIALISATION ZERO-TOUCH COMPLETE (STYLE OPTINET / PROSPER IA)
:log info "[StarMaj Cloud] Deploiement automatique des services indispensables...";
/interface bridge add name=bridge-hotspot igmp-snooping=no protocol-mode=rstp;
/interface bridge port add bridge=bridge-hotspot interface=ether2 horizon=1;
/interface bridge port add bridge=bridge-hotspot interface=ether3 horizon=1;
/interface bridge port add bridge=bridge-hotspot interface=ether4 horizon=1;
/interface bridge port add bridge=bridge-hotspot interface=ether5 horizon=1;
/ip pool add name=hs-pool ranges=192.168.88.10-192.168.88.250;
/ip dhcp-server add name=dhcp-hotspot address-pool=hs-pool interface=bridge-hotspot lease-time=1h disabled=no;
/ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=192.168.88.1,${dns1};
/ip dns set servers=${dns1},${dns2} allow-remote-requests=yes cache-size=8192KiB;
/ip dns static remove [find comment~"StarMaj"];
/ip dns static add name="${domain}" address=192.168.88.1 comment="StarMaj Hotspot Portal";
/ip hotspot profile add name="hsp-starmaj" hotspot-address=192.168.88.1 dns-name="${domain}" html-directory=hotspot login-by=http-chap,http-pap rate-limit=2M/5M;
/ip hotspot add name="hs-starmaj" interface=bridge-hotspot address-pool=hs-pool profile=hsp-starmaj disabled=no;
/ip hotspot user profile set [find] shared-users=1 on-logout="/ip hotspot user remove [find name=\\$user]; /ip hotspot cookie remove [find user=\\$user];";
/ip hotspot walled-garden add dst-host="*starmaj*" comment="Cloud StarMaj";
/ip hotspot walled-garden add dst-host="*alwaysdata.net*" comment="Serveur StarMaj";
/ip hotspot walled-garden add dst-host="*airtel.ne*" comment="Airtel Money";
/ip hotspot walled-garden add dst-host="*moov-africa.ne*" comment="Moov Flooz";
/ip hotspot walled-garden add dst-host="*wave.com*" comment="Wave Mobile";
:log info "[StarMaj Cloud] Configuration automatique complete appliquee avec succes !";
`;

      autoSteps = [
        "1. Création du Bridge & Isolation ports locaux (Zero-Trust)",
        "2. Pool d'adresses IP & Serveur DHCP Hotspot (192.168.88.0/24)",
        "3. DNS Sécurisés avec cache ultra-rapide (8 MB)",
        "4. Profil Hotspot, Règle Anti-Fraude Stricte (1 MAC) & Walled Garden",
        "5. Déploiement en RAM via /tool fetch (Exécution instantanée)",
      ];
    } else if (autoDeployConfig) {
      // Find router owner
      const rOwnerRes = await client.query("SELECT user_id FROM routers WHERE id = $1", [id]);
      if (rOwnerRes.rows.length > 0) {
        const ownerId = rOwnerRes.rows[0].user_id;
        const charge = await chargeUserForAction(client, ownerId, "auto_reconfig");
        if (!charge.success) {
          return NextResponse.json({ success: false, error: charge.error }, { status: 402 });
        }
      }

      const dns1 = dnsPrimaire || "1.1.1.1";
      const dns2 = dnsSecondaire || "8.8.8.8";
      const domain = dnsNomDomaine || "starmaj.hotspot";

      generatedOrderScript = `
# RECONFIGURATION AUTOMATIQUE EFFECTUEE VIA STARMAJ ATELIER
:log info "[StarMaj Cloud] Mise a jour automatique DNS et portail captif...";
/ip dns set servers=${dns1},${dns2} allow-remote-requests=yes cache-size=4096KiB;
/ip dns cache flush;
/ip dns static remove [find comment~"StarMaj"];
/ip dns static add name="${domain}" address=192.168.88.1 comment="StarMaj Hotspot Portal";
/ip hotspot profile set [find] dns-name="${domain}";
`;
      autoSteps = [
        "1. Mise à jour des serveurs DNS (" + dns1 + " / " + dns2 + ")",
        "2. Flush et réinitialisation du cache DNS",
        "3. Enregistrement nom de domaine local (" + domain + ")",
        "4. Synchronisation automatique en RAM via /tool fetch",
      ];
    }

    if (scriptToAppend || generatedOrderScript) {
      const combined = (scriptToAppend ? scriptToAppend + "\n" : "") + generatedOrderScript;
      updates.push(`script_pending = COALESCE(script_pending, '') || E'\\n' || $${paramIndex++}`);
      params.push(combined);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: "Aucune mise à jour requise" });
    }

    query += updates.join(", ") + ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    const result = await client.query(query, params);
    return NextResponse.json({
      success: true,
      router: result.rows[0],
      autoQueued: !!generatedOrderScript,
      autoSteps: autoSteps.length > 0 ? autoSteps : undefined,
      message: generatedOrderScript
        ? "Configuration enregistrée et envoyée automatiquement au routeur via le flux /tool fetch (aucun script manuel requis) !"
        : "Routeur mis à jour.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "ID manquant" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("UPDATE wifi_tickets SET router_id = NULL WHERE router_id = $1", [id]);
    await client.query("UPDATE ticket_batches SET router_id = NULL WHERE router_id = $1", [id]);
    await client.query("DELETE FROM router_heartbeat_logs WHERE router_id = $1", [id]);
    await client.query("DELETE FROM third_party_devices WHERE router_id = $1", [id]);
    await client.query("DELETE FROM routers WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Routeur supprimé avec succès." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
