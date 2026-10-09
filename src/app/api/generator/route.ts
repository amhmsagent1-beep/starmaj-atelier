import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, host, token, intervalMinutes = 2, wanLines = 2, wanInterfaces = ["ether1", "ether2", "ether3"], hotspotInterface = "bridge-hotspot", hotspotSubnet = "192.168.88.0/24" } = body;

  const baseDomain = host || "starmaj-atelier.alwaysdata.net";

  if (type === "scheduler_fetch") {
    // Zero-Touch Automation : Execution 100% en RAM via output=user et [:parse] (aucun fichier physique)
    const script = `/system scheduler remove [find name="StarMaj_Heartbeat"]
/system script remove [find name="StarMaj_Fetch_Run"]
/system script add name="StarMaj_Fetch_Run" source={
    :local rToken "${token || "SM-RTR-4993-QJAI"}"
    :local srvHost "${baseDomain || "starmaj-atelier.vercel.app"}"
    :local cpuLoad [/system resource get cpu-load]
    :local upTime [/system resource get uptime]
    :local memFreeBrut [/system resource get free-memory]
    :local memFree ($memFreeBrut / 1048576)
    :local rosVer [/system resource get version]
    :local activeUsers 0
    :do { :set activeUsers [/ip hotspot active print count-only] } on-error={ :set activeUsers 0 }
    :local fetchUrl "https://$srvHost/api/heartbeat?token=$rToken&cpu=$cpuLoad&uptime=$upTime&mem=$memFree&ver=$rosVer&users=$activeUsers"
    :do {
        :local res [/tool fetch url=$fetchUrl output=user as-value check-certificate=no]
        :if ($res->"status" = "finished") do={
            :local cmdData ($res->"data")
            :if ([:len $cmdData] > 0) do={
                [:parse $cmdData]
                :log info "[StarMaj] Ordres Cloud executes en RAM avec succes."
            }
        }
    } on-error={ :log warning "[StarMaj] Echec communication Cloud StarMaj" }
}
/system scheduler add name="StarMaj_Heartbeat" start-time=startup interval=${intervalMinutes}m on-event="StarMaj_Fetch_Run"
/system script run StarMaj_Fetch_Run`;

    return NextResponse.json({ success: true, script });
  }

  if (type === "pcc_loadbalancing") {
    // PCC Generator for RouterOS v7+
    const lines = Math.min(Math.max(parseInt(wanLines, 10), 2), 8);
    const commands: string[] = [];

    commands.push(`################################################################################`);
    commands.push(`# STARMAJ ATELIER - AGREGATION DE LIGNES PCC HAUTE PERFORMANCE`);
    commands.push(`# Compatible RouterOS v7+ | ${lines} Lignes Internet simultanees`);
    commands.push(`################################################################################\n`);

    commands.push(`/routing table add name=to_WAN1 fib;`);
    for (let i = 2; i <= lines; i++) {
      commands.push(`/routing table add name=to_WAN${i} fib;`);
    }

    commands.push(`\n# 1. Marques de connexion et classificateur PCC (${lines} flux équilibrés)`);
    commands.push(`/ip firewall mangle`);
    
    // Accept local traffic
    commands.push(`add chain=prerouting dst-address=192.168.0.0/16 action=accept comment="StarMaj - Bypass trafic local"`);
    commands.push(`add chain=prerouting dst-address=10.0.0.0/8 action=accept`);

    for (let i = 1; i <= lines; i++) {
      const iface = wanInterfaces[i - 1] || `ether${i}`;
      commands.push(`add chain=prerouting in-interface=${iface} connection-state=new action=mark-connection new-connection-mark=WAN${i}_conn passthrough=yes comment="StarMaj In WAN${i}"`);
    }

    // PCC classifier
    for (let i = 0; i < lines; i++) {
      const idx = i + 1;
      commands.push(`add chain=prerouting in-interface=${hotspotInterface} connection-state=new dst-address-type=!local per-connection-classifier=both-addresses-and-ports:${lines}/${i} action=mark-connection new-connection-mark=WAN${idx}_conn passthrough=yes comment="StarMaj PCC ${idx}/${lines}"`);
    }

    // Mark routing
    for (let i = 1; i <= lines; i++) {
      commands.push(`add chain=prerouting connection-mark=WAN${i}_conn in-interface=${hotspotInterface} action=mark-routing new-routing-mark=to_WAN${i} passthrough=yes`);
      commands.push(`add chain=output connection-mark=WAN${i}_conn action=mark-routing new-routing-mark=to_WAN${i} passthrough=no`);
    }

    commands.push(`\n# 2. NAT Masquerade sortant`);
    commands.push(`/ip firewall nat`);
    for (let i = 1; i <= lines; i++) {
      const iface = wanInterfaces[i - 1] || `ether${i}`;
      commands.push(`add chain=srcnat out-interface=${iface} action=masquerade comment="NAT WAN${i}"`);
    }

    commands.push(`\n# 3. Failover automatique via Check-Gateway`);
    commands.push(`/ip route`);
    for (let i = 1; i <= lines; i++) {
      const gw = `192.168.${i}.1`;
      commands.push(`add gateway=${gw} check-gateway=ping routing-table=to_WAN${i} distance=1 comment="Route dediee WAN${i}"`);
      commands.push(`add gateway=${gw} check-gateway=ping distance=${i} comment="Failover global WAN${i}"`);
    }

    return NextResponse.json({ success: true, script: commands.join("\n") });
  }

  if (type === "ha_vpn_backup") {
    const script = `################################################################################
# STARMAJ ATELIER - TUNNEL VPN HAUTE DISPONIBILITÉ (OBJECTIF UPTIME 99%)
# Failover automatique vers secours 4G/Satellite si la fibre principale coupe
################################################################################

# 1. Configuration WireGuard / SSTP de secours
/interface wireguard add name="wg-starmaj-backup" listen-port=13231 private-key="auto-generated-key";
/interface wireguard peers add interface="wg-starmaj-backup" public-key="STARMAJ_CORE_PUBLIC_KEY" endpoint-address="${baseDomain}" endpoint-port=51820 allowed-address=10.250.0.0/24 persistent-keepalive=25s;

/ip address add address=10.250.0.88/24 interface="wg-starmaj-backup" network=10.250.0.0;

# 2. Watchdog de supervision de connectivite
/tool netwatch add host=1.1.1.1 interval=10s timeout=1500ms up-script={
    :log info "[StarMaj HA] Ligne principale UP - Trafic nominal";
} down-script={
    :log error "[StarMaj HA] Alerte coupure detectee ! Basculement immediat sur tunnel de secours...";
    /ip route set [find comment="Default Route Primary"] distance=10;
    /ip route set [find comment="Backup StarMaj Tunnel"] distance=1;
};
`;
    return NextResponse.json({ success: true, script });
  }

  if (type === "prosper_ia_bootstrap") {
    const script = `################################################################################
# STARMAJ ATELIER - INITIALISATION IA COMPLETE (PROSPER & SOPHIA IA)
# Deploiement Hotspot cle-en-main, securite, isolation clients, DNS optimises
################################################################################

# 1. Creation du Bridge Hotspot et isolation des clients (Securite Zero Trust)
/interface bridge add name=bridge-hotspot igmp-snooping=no protocol-mode=rstp;
/interface bridge port add bridge=bridge-hotspot interface=ether2 horizon=1;
/interface bridge port add bridge=bridge-hotspot interface=ether3 horizon=1;
/interface bridge port add bridge=bridge-hotspot interface=ether4 horizon=1;
/interface bridge port add bridge=bridge-hotspot interface=ether5 horizon=1;

# 2. Pool d'adresses et Serveur DHCP Hotspot
/ip pool add name=hs-pool-1 ranges=192.168.88.10-192.168.88.250;
/ip dhcp-server add name=dhcp-hotspot address-pool=hs-pool-1 interface=bridge-hotspot lease-time=1h disabled=no;
/ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=192.168.88.1,1.1.1.1;

# 3. DNS et Cache ultra-rapide
/ip dns set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes cache-size=8192KiB;
/ip dns static add name="starmaj.hotspot" address=192.168.88.1 comment="StarMaj Atelier Hotspot Portal";

# 4. Profil Hotspot et Regle Anti-Fraude Stricte (1 MAC par ticket)
/ip hotspot profile add name="hsp-starmaj" hotspot-address=192.168.88.1 dns-name="starmaj.hotspot" html-directory=hotspot login-by=http-chap,http-pap rate-limit=2M/5M;
/ip hotspot add name="hs-starmaj" interface=bridge-hotspot address-pool=hs-pool-1 profile=hsp-starmaj disabled=no;

/ip hotspot user profile add name="default" shared-users=1 keepalive-timeout=2m on-logout="/ip hotspot user remove [find name=\\$user]; /ip hotspot cookie remove [find user=\\$user];" status-autorefresh=1m transparent-proxy=no;
/ip hotspot user profile add name="1H-Express" rate-limit="1M/2M" shared-users=1 on-logout="/ip hotspot user remove [find name=\\$user];";
/ip hotspot user profile add name="3H-Standard" rate-limit="1M/3M" shared-users=1 on-logout="/ip hotspot user remove [find name=\\$user];";
/ip hotspot user profile add name="VIP-Illimite" rate-limit="3M/10M" shared-users=1 on-logout="/ip hotspot user remove [find name=\\$user];";

# 5. Walled Garden (Acces libre pour paiement StarMaj et Mobile Money Niger)
/ip hotspot walled-garden add dst-host="*starmaj*" comment="Portail StarMaj";
/ip hotspot walled-garden add dst-host="*alwaysdata.net*" comment="Serveur StarMaj";
/ip hotspot walled-garden add dst-host="*airtel.ne*" comment="Airtel Money";
/ip hotspot walled-garden add dst-host="*moov-africa.ne*" comment="Moov Flooz";
/ip hotspot walled-garden add dst-host="*wave.com*" comment="Wave Mobile";

:log info "[StarMaj IA] Initialisation complete du routeur achevee avec succes !";
`;
    return NextResponse.json({ success: true, script });
  }

  return NextResponse.json({ success: false, error: "Type de generateur non supporte" }, { status: 400 });
}
