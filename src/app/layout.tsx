import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Defterdar", template: "%s · Defterdar" },
  description: "Mali müşavirler için aylık evrak toplama: mükellef linkten yükler, sistem sınıflandırır, siz onaylarsınız.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1f2740",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
