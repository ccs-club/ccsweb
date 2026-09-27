import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { LocaleProvider } from "./locale-provider";
import { dictionaries } from "./i18n";
import { SITE_URL } from "@/lib/site-config";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: dictionaries.en.meta.title,
  description: dictionaries.en.meta.description,
  openGraph: {
    type: "website",
    siteName: "CCS Club",
    title: dictionaries.en.meta.title,
    description: dictionaries.en.meta.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: dictionaries.en.meta.title,
    description: dictionaries.en.meta.description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="background-wash" aria-hidden="true" />
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
