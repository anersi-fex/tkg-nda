import type { Metadata, Viewport } from "next";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

/** The live address for link previews; a malformed APP_URL never takes a page down. */
function appBase(): URL {
  try {
    return new URL(process.env.APP_URL || "https://tkg-nda.vercel.app");
  } catch {
    return new URL("https://tkg-nda.vercel.app");
  }
}

export const metadata: Metadata = {
  metadataBase: appBase(),
  title: { default: "Ink", template: "%s | Ink" },
  description: "Sign an agreement on your phone. By TKG.",
  applicationName: "Ink",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Ink", statusBarStyle: "default" },
  other: { "apple-mobile-web-app-capable": "yes" },
  openGraph: {
    type: "website",
    siteName: "Ink",
    title: "Ink",
    description: "by The Koka Group",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Ink by The Koka Group" }],
  },
  twitter: { card: "summary_large_image", title: "Ink", description: "by The Koka Group", images: ["/og.jpg"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-ink text-gray-900">{children}</body>
    </html>
  );
}
