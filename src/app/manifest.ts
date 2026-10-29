import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ink by TKG",
    short_name: "Ink",
    description: "Agreements signed on a phone, with a full record of every tap.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f3f7",
    theme_color: "#1f2937",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
