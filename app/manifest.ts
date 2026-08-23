import type { MetadataRoute } from "next";

/** PWA Web App Manifest（Next.js App Router 自动生成 /manifest.webmanifest） */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BizMentor AI",
    short_name: "BizMentor",
    description: "个人 AI 商业导师与商业机会操作系统",
    lang: "zh-CN",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}