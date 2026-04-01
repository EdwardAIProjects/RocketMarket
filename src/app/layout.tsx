import type { Metadata } from "next";
import { LocalModeBanner } from "@/components/local-mode-banner";
import { TopNav } from "@/components/top-nav";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RocketMarket",
  description: "A play-money prediction market for a school rocketry team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(50,90,160,0.28),_transparent_22%),radial-gradient(circle_at_80%_0%,_rgba(101,167,255,0.18),_transparent_18%),linear-gradient(180deg,_#08111f_0%,_#0c1424_50%,_#0a1120_100%)] text-foreground">
          <LocalModeBanner />
          <TopNav />
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
