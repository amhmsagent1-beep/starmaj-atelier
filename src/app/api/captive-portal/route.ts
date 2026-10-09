import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { chargeUserForAction } from "@/lib/pricing";

export function generatePortalHtml({
  nomEtablissement = "STARMAJ HOTSPOT ZONE",
  themeCouleur = "amber_dark",
  messageBienvenue = "Bienvenue sur notre réseau WiFi Haute Vitesse ! Connectez-vous avec votre coupon.",
  contactAssistance = "+227 90 00 11 22",
  logoText = "STARMAJ WIFI",
  tarifsAffichage = "1H = 100 CFA (2 SC) | 3H = 250 CFA (5 SC) | 24H = 500 CFA (10 SC)",
  politiqueUtilisation = "L'accès à ce réseau est strictement réservé aux usages licites. Le piratage, téléchargement illégal et la saturation intentionnelle du réseau sont strictement interdits. Une seule session simultanée par appareil MAC autorisée.",
  conditionsGenerales = "En vous connectant avec votre coupon, vous acceptez nos conditions d'accès internet haut débit. StarMaj Atelier garantit une bande passante optimisée. En cas de problème, contactez le numéro d'assistance figurant sur votre reçu.",
  dnsNomDomaine = "starmaj.hotspot",
}: {
  nomEtablissement?: string;
  themeCouleur?: string;
  messageBienvenue?: string;
  contactAssistance?: string;
  logoText?: string;
  tarifsAffichage?: string;
  politiqueUtilisation?: string;
  conditionsGenerales?: string;
  dnsNomDomaine?: string;
}) {
  const themes: Record<string, { bg: string; card: string; accent: string; btn: string; border: string }> = {
    amber_dark: {
      bg: "#090d16",
      card: "#111827",
      accent: "#f59e0b",
      btn: "linear-gradient(135deg, #f59e0b, #ea580c)",
      border: "#f59e0b44",
    },
    emerald_modern: {
      bg: "#05130f",
      card: "#06221c",
      accent: "#10b981",
      btn: "linear-gradient(135deg, #10b981, #0d9488)",
      border: "#10b98144",
    },
    blue_corporate: {
      bg: "#0a0f1d",
      card: "#0f172a",
      accent: "#38bdf8",
      btn: "linear-gradient(135deg, #0284c7, #4f46e5)",
      border: "#38bdf844",
    },
    violet_neon: {
      bg: "#120824",
      card: "#1e1038",
      accent: "#c084fc",
      btn: "linear-gradient(135deg, #9333ea, #db2777)",
      border: "#c084fc44",
    },
    red_cyber: {
      bg: "#18060a",
      card: "#240b12",
      accent: "#f43f5e",
      btn: "linear-gradient(135deg, #e11d48, #ea580c)",
      border: "#f43f5e44",
    },
    gold_luxury: {
      bg: "#100d07",
      card: "#1c180f",
      accent: "#eab308",
      btn: "linear-gradient(135deg, #eab308, #ca8a04)",
      border: "#eab30855",
    },
    white_clean: {
      bg: "#f8fafc",
      card: "#ffffff",
      accent: "#0284c7",
      btn: "linear-gradient(135deg, #0284c7, #0369a1)",
      border: "#cbd5e1",
    },
    transit_yellow: {
      bg: "#0c0a09",
      card: "#1c1917",
      accent: "#facc15",
      btn: "linear-gradient(135deg, #facc15, #eab308)",
      border: "#facc1566",
    },
  };

  const t = themes[themeCouleur] || themes.amber_dark;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${nomEtablissement} - Portail WiFi</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body {
            background: ${t.bg};
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 16px;
        }
        .container {
            width: 100%;
            max-width: 440px;
            background: ${t.card};
            border: 1px solid ${t.border};
            border-radius: 24px;
            padding: 28px 24px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.7);
            text-align: center;
        }
        .nav-tabs {
            display: flex;
            background: rgba(0,0,0,0.3);
            border-radius: 12px;
            padding: 4px;
            margin-bottom: 20px;
            gap: 4px;
        }
        .tab-btn {
            flex: 1;
            padding: 8px 10px;
            font-size: 11px;
            font-weight: 700;
            color: #94a3b8;
            background: transparent;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: 0.2s;
        }
        .tab-btn.active {
            background: ${t.accent};
            color: #020617;
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .logo-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.05);
            color: ${t.accent};
            font-size: 11px;
            font-weight: 800;
            padding: 6px 16px;
            border-radius: 999px;
            border: 1px solid ${t.border};
            letter-spacing: 1.5px;
            margin-bottom: 12px;
            text-transform: uppercase;
        }
        h1 { font-size: 21px; font-weight: 900; color: #ffffff; margin-bottom: 6px; letter-spacing: -0.5px; }
        p.subtitle { font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 18px; }
        .pricing-banner {
            background: rgba(0,0,0,0.25);
            border: 1px dashed ${t.border};
            border-radius: 12px;
            padding: 10px 14px;
            font-size: 11px;
            color: ${t.accent};
            font-weight: 700;
            margin-bottom: 18px;
        }
        .form-group { text-align: left; margin-bottom: 14px; }
        label { display: block; font-size: 11px; font-weight: 700; color: #cbd5e1; margin-bottom: 6px; }
        input[type="text"], input[type="password"] {
            width: 100%;
            background: #0b0f19;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 12px 14px;
            color: #f8fafc;
            font-size: 15px;
            font-weight: 800;
            outline: none;
            transition: border-color 0.2s;
            text-transform: uppercase;
        }
        input:focus { border-color: ${t.accent}; }
        button[type="submit"] {
            width: 100%;
            background: ${t.btn};
            color: #020617;
            font-size: 14px;
            font-weight: 900;
            padding: 14px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4);
            margin-top: 6px;
        }
        .info-panel {
            text-align: left;
            font-size: 12px;
            color: #cbd5e1;
            line-height: 1.6;
            background: rgba(0,0,0,0.2);
            padding: 16px;
            border-radius: 14px;
            border: 1px solid #334155;
            max-height: 280px;
            overflow-y: auto;
        }
        .info-panel h3 { color: ${t.accent}; font-size: 13px; margin-bottom: 8px; font-weight: 800; }
        .help-box {
            margin-top: 20px;
            padding-top: 14px;
            border-top: 1px solid #1f2937;
            font-size: 11px;
            color: #64748b;
        }
        .help-box strong { color: ${t.accent}; font-size: 12px; }
        .footer-tag { font-size: 9px; color: #475569; margin-top: 8px; display: block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-badge">${logoText}</div>
        <h1>${nomEtablissement}</h1>
        <p class="subtitle">${messageBienvenue}</p>

        <!-- Onglets interactifs -->
        <div class="nav-tabs">
            <button class="tab-btn active" onclick="openTab(event, 'loginTab')">CONNEXION</button>
            <button class="tab-btn" onclick="openTab(event, 'conditionsTab')">CONDITIONS</button>
            <button class="tab-btn" onclick="openTab(event, 'politiqueTab')">POLITIQUE</button>
            <button class="tab-btn" onclick="openTab(event, 'contactTab')">CONTACT</button>
        </div>

        <!-- 1. PAGE CONNEXION -->
        <div id="loginTab" class="tab-content active">
            <div class="pricing-banner">
                💰 TARIFS : ${tarifsAffichage}
            </div>

            <form name="login" action="$(link-login-only)" method="post" $(if chap-id) onSubmit="return doLogin()" $(endif)>
                <input type="hidden" name="dst" value="$(link-orig)" />
                <input type="hidden" name="popup" value="true" />

                <div class="form-group">
                    <label for="username">CODE DU TICKET / COUPON :</label>
                    <input type="text" id="username" name="username" placeholder="EX: SM-7821" required autocomplete="off" autocapitalize="characters" />
                </div>

                <div class="form-group">
                    <label for="password">MOT DE PASSE (Si demandé) :</label>
                    <input type="password" id="password" name="password" placeholder="••••" autocomplete="off" />
                </div>

                <button type="submit">SE CONNECTER À INTERNET</button>
            </form>
        </div>

        <!-- 2. CONDITIONS GÉNÉRALES -->
        <div id="conditionsTab" class="tab-content">
            <div class="info-panel">
                <h3>📜 Conditions Générales d'Accès</h3>
                <p>${conditionsGenerales}</p>
                <br>
                <p>• Débit garanti selon le coupon activé.</p>
                <p>• 1 seul appareil simultané par coupon (Règle Anti-fraude stricte).</p>
                <p>• Validité décomptée dès la première connexion physique.</p>
            </div>
        </div>

        <!-- 3. POLITIQUE D'UTILISATION -->
        <div id="politiqueTab" class="tab-content">
            <div class="info-panel">
                <h3>🛡️ Politique d'Utilisation Acceptable</h3>
                <p>${politiqueUtilisation}</p>
                <br>
                <p>• Respect de la législation télécoms en vigueur.</p>
                <p>• Protection de la vie privée des utilisateurs connectés.</p>
                <p>• Filtrage de sécurité actif contre les malwares et attaques DDoS.</p>
            </div>
        </div>

        <!-- 4. CONTACT & ASSISTANCE -->
        <div id="contactTab" class="tab-content">
            <div class="info-panel">
                <h3>📞 Service Client & Mobile Money</h3>
                <p>Pour acheter un ticket ou obtenir de l'assistance en ligne :</p>
                <br>
                <p>Numéro Direct / WhatsApp : <strong>${contactAssistance}</strong></p>
                <p>Paiements acceptés : <strong>Airtel Money, Moov Flooz, Zamani Cash, Alza, Wave</strong></p>
            </div>
        </div>

        <div class="help-box">
            Assistance & Recharge Rapide : <strong>${contactAssistance}</strong>
            <span class="footer-tag">StarMaj Atelier Cloud • Hotspot Haute Disponibilité • 1 MAC Strict</span>
        </div>
    </div>

    <script>
        function openTab(evt, tabName) {
            var i, tabcontent, tablinks;
            tabcontent = document.getElementsByClassName("tab-content");
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].classList.remove("active");
            }
            tablinks = document.getElementsByClassName("tab-btn");
            for (i = 0; i < tablinks.length; i++) {
                tablinks[i].classList.remove("active");
            }
            document.getElementById(tabName).classList.add("active");
            evt.currentTarget.classList.add("active");
        }
    </script>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const templateId = url.searchParams.get("id");

  const client = await pool.connect();
  try {
    if (templateId) {
      const res = await client.query("SELECT * FROM captive_templates WHERE id = $1", [templateId]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Template non trouvé" }, { status: 404 });
      }
      return NextResponse.json({ success: true, template: res.rows[0] });
    }

    let query = "SELECT * FROM captive_templates";
    const params: any[] = [];
    if (userId) {
      query += " WHERE user_id = $1 OR user_id IS NULL";
      params.push(parseInt(userId, 10));
    }
    query += " ORDER BY id ASC";

    const res = await client.query(query, params);
    return NextResponse.json({ success: true, templates: res.rows });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    userId,
    titre,
    themeCouleur = "amber_dark",
    nomEtablissement = "STARMAJ HOTSPOT ZONE",
    messageBienvenue = "Bienvenue sur notre réseau WiFi Haute Vitesse ! Connectez-vous avec votre coupon.",
    contactAssistance = "+227 90 00 11 22",
    logoText = "STARMAJ WIFI",
    tarifsAffichage = "1H = 100 CFA (2 SC) | 3H = 250 CFA (5 SC) | 24H = 500 CFA (10 SC)",
    politiqueUtilisation,
    conditionsGenerales,
  } = body;

  if (!titre) {
    return NextResponse.json({ success: false, error: "Titre du modèle requis" }, { status: 400 });
  }

  const generatedHtml = generatePortalHtml({
    nomEtablissement,
    themeCouleur,
    messageBienvenue,
    contactAssistance,
    logoText,
    tarifsAffichage,
    politiqueUtilisation,
    conditionsGenerales,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (userId) {
      const charge = await chargeUserForAction(client, parseInt(userId, 10), "create_portal");
      if (!charge.success) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: charge.error }, { status: 402 });
      }
    }

    const res = await client.query(
      `INSERT INTO captive_templates 
       (user_id, titre, theme_couleur, nom_etablissement, message_bienvenue, contact_assistance, logo_text, tarifs_affichage, html_complet)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId || null,
        titre,
        themeCouleur,
        nomEtablissement,
        messageBienvenue,
        contactAssistance,
        logoText,
        tarifsAffichage,
        generatedHtml,
      ]
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true, template: res.rows[0] });
  } catch (e: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const {
    id,
    titre,
    themeCouleur,
    nomEtablissement,
    messageBienvenue,
    contactAssistance,
    logoText,
    tarifsAffichage,
    politiqueUtilisation,
    conditionsGenerales,
  } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: "ID manquant" }, { status: 400 });
  }

  const generatedHtml = generatePortalHtml({
    nomEtablissement,
    themeCouleur,
    messageBienvenue,
    contactAssistance,
    logoText,
    tarifsAffichage,
    politiqueUtilisation,
    conditionsGenerales,
  });

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE captive_templates 
       SET titre = COALESCE($1, titre),
           theme_couleur = COALESCE($2, theme_couleur),
           nom_etablissement = COALESCE($3, nom_etablissement),
           message_bienvenue = COALESCE($4, message_bienvenue),
           contact_assistance = COALESCE($5, contact_assistance),
           logo_text = COALESCE($6, logo_text),
           tarifs_affichage = COALESCE($7, tarifs_affichage),
           html_complet = $8
       WHERE id = $9
       RETURNING *`,
      [
        titre,
        themeCouleur,
        nomEtablissement,
        messageBienvenue,
        contactAssistance,
        logoText,
        tarifsAffichage,
        generatedHtml,
        id,
      ]
    );

    return NextResponse.json({ success: true, template: res.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}
