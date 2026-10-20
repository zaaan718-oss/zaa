import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ViewModeProvider } from "@/components/ViewModeProvider";
import ViewModeToggle from "@/components/ViewModeToggle";
import Heartbeat from "@/components/Heartbeat";
import { SettingsProvider } from "@/components/SettingsProvider";
import GlobalBackground from "@/components/GlobalBackground";
import { CallProvider } from "@/components/CallProvider";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FrameX — Optimasi Video & Alat TikTok",
  description: "Optimasi video ke 250 FPS & Ultra HD, plus cek video TikTok tanpa watermark.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black font-[family-name:var(--font-body)]">
        <SettingsProvider>
          <GlobalBackground />
          <CallProvider>
            <ViewModeProvider>{children}</ViewModeProvider>
            <ViewModeToggle />
            <Heartbeat />
          </CallProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
