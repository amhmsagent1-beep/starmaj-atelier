import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "StarMaj Atelier | Gestion Cloud MikroTik, Hotspot & Mikhmon Intégré",
  description:
    "Plateforme Cloud MikroTik, Hotspot WiFi, Mikhmon léger, Roaming, LoadBalancing PCC et automatisation IA avec monnaie StarCoin (SC) au Niger.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased font-sans selection:bg-amber-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
