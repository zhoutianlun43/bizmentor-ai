import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { UserStatusBar } from "@/components/layout/UserStatusBar";
import { OnboardingGuard } from "@/components/home/OnboardingGuard";
import { RegisterSW } from "@/components/RegisterSW";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const APP_NAME = "BizMentor AI";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description:
    "个人 AI 商业导师与商业机会操作系统：发现 → 理解 → 判断 → 验证 → 复盘 → 成长。",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: "BizMentor",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

/** 移动端 viewport（PWA：iPhone Safari 添加到主屏幕） */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

/** 首帧前应用主题，避免深浅色闪烁（与 ThemeProvider 共用同一存储 key） */
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("bizmentor:v1:theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        {/* 兼容旧版 iOS Safari 添加到主屏幕 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>
          {/* 手机优先：内容居中并限制最大宽度，模拟 iPhone 屏幕 */}
          <div className="mx-auto min-h-dvh w-full max-w-md">
            <OnboardingGuard />
            <UserStatusBar />
            <main className="pb-28">{children}</main>
            <BottomNav />
          </div>
          <RegisterSW />
        </ThemeProvider>
      </body>
    </html>
  );
}