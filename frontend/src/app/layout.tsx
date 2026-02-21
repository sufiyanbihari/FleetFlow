import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FleetFlow OS | ABAC Operations",
  description: "Enterprise Fleet Management Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white h-screen overflow-hidden flex`}
      >
        <Sidebar />
        <main className="flex-1 h-full overflow-y-auto bg-neutral-900 shadow-inner rounded-l-3xl border-l border-neutral-800 shadow-2xl relative z-10">
          <div className="max-w-7xl mx-auto p-4 pt-16 md:p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
