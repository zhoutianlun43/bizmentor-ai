/**
 * PWA Web App Manifest 配置（V0.4.2 Phase 9B-5-C）。
 * 单一事实源：app/manifest.ts 引用本配置生成 /manifest.webmanifest；测试也可直接校验。
 */
export interface PwaIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: "maskable" | "any" | "monochrome";
}

export interface PwaManifestConfig {
  name: string;
  short_name: string;
  description: string;
  lang: string;
  start_url: string;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  orientation: "portrait" | "landscape";
  background_color: string;
  theme_color: string;
  icons: PwaIcon[];
}

export const pwaManifest: PwaManifestConfig = {
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
    { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export type PwaManifest = PwaManifestConfig;