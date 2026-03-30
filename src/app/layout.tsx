import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VALVRAVE-RESONANCE | V2実戦分析",
  description: "ヴァルヴレイヴ2 実戦データ精密分析システム",
  // PWA対応 (ホールでの使用を想定)
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "V2-Analytic",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,       // ホール操作: 拡大無効
  userScalable: false,
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body className="antialiased min-h-screen bg-v2-black">
        {children}
      </body>
    </html>
  );
}
