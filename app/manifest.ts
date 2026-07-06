import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StoreCount",
    short_name: "StoreCount",
    description:
      "Track your products, record sales in seconds, and see your profit instantly.",
    id: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f7f6",
    theme_color: "#f4f7f6",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
