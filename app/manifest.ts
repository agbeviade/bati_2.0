import type { MetadataRoute } from "next";

// Web App Manifest — déclare BatiFlow comme installable (PWA).
// Les icônes 192/512 PNG sont à ajouter dans /public/icons/ pour que les
// devices Android et l'écran d'accueil iOS affichent une vraie icône.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BatiFlow",
    short_name: "BatiFlow",
    description: "Gestion de chantier & devis BTP",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#f97316", // brand orange
    lang: "fr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "productivity"],
  };
}
