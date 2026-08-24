import type { MetadataRoute } from "next";
import { pwaManifest } from "@/lib/pwa/manifest";

/** PWA Web App Manifest（Next.js App Router 自动生成 /manifest.webmanifest） */
export default function manifest(): MetadataRoute.Manifest {
  return { ...pwaManifest };
}