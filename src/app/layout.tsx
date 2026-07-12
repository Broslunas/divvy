import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
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
  title: {
    default: "Divvy — Gastos Compartidos y Cuentas Claras",
    template: "%s | Divvy"
  },
  description: "Lleva el control, división y liquidación de tus gastos grupales de viajes, comidas y más. Cuentas claras para todos de forma sencilla.",
  keywords: ["dividir gastos", "gastos compartidos", "cuentas claras", "viajes en grupo", "control de gastos", "bono cultural", "divvy"],
  authors: [{ name: "Divvy Team" }],
  creator: "Divvy",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://divvy.es"),
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Divvy",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://divvy.es",
    title: "Divvy — Gastos Compartidos y Cuentas Claras",
    description: "Lleva el control, división y liquidación de tus gastos grupales de viajes, comidas y más. Fácil, rápido y transparente.",
    siteName: "Divvy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Divvy — Gastos Compartidos",
    description: "Lleva el control, división y liquidación de tus gastos grupales de viajes, comidas y más.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import CookieConsent from "@/components/CookieConsent";
import OfflineBanner from "@/components/OfflineBanner";
import Header from "@/components/Header";

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
        <OfflineBanner />
        <Header />
        {children}
        <CookieConsent />
        <Script
          defer
          src="https://analytics.broslunas.com/script.js"
          data-website-id="0590481e-5f52-4a6b-aed2-bccc19c393ec"
        />
      </body>
    </html>
  );
}
