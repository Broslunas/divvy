import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#FAF9F6",
};

export const metadata: Metadata = {
  title: "Divvy — Gastos Compartidos",
  description: "Lleva el control, división y liquidación de tus gastos grupales de viajes, comidas y más.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Divvy",
  },
};

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import PushNotificationManager from "@/components/PushNotificationManager";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={plusJakartaSans.variable}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ServiceWorkerRegister />
        <PushNotificationManager />
        {children}
      </body>
    </html>
  );
}
