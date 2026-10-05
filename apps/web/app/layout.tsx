import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import { site } from "@/lib/site";
import "./globals.css";

const GOOGLE_TAG_ID = "G-BLYYWC92NG";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
// Mono only styles the editors and code snippets, so it isn't worth a preload
// competing with the hero text on slow connections; it swaps in when ready.
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", preload: false });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: remove invisible watermarks from AI text`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "AI watermark remover",
    "invisible watermarks",
    "zero-width space remover",
    "unicode watermarks",
    "tag characters",
    "clean AI text",
    "chatgpt watermark remover",
    "remove hidden characters",
  ],
  authors: [{ name: "I Hate Watermarks" }],
  creator: "I Hate Watermarks",
  publisher: "I Hate Watermarks",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${site.name}: remove invisible watermarks from AI text`,
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name}: remove invisible watermarks from AI text`,
    description: site.description,
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {/* lazyOnload: the 180 KB tag waits until the page has loaded instead of
            competing with the page's own CSS, fonts and JS for bandwidth. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
          strategy="lazyOnload"
        />
        <Script id="google-tag" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_TAG_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
