import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientLayout } from "@/components/ClientLayout";
import { SocketProvider } from "@/providers/SocketProvider";
import { Toaster } from 'react-hot-toast';
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
        <SocketProvider>
          <ClientLayout>{children}</ClientLayout>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#171717',
                color: '#fff',
                border: '1px solid #262626',
              }
            }}
          />
        </SocketProvider>
      </body>
    </html>
  );
}
