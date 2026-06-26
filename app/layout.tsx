import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://campusconnect.app"),
  title: {
    default: "CampusConnect — The private campus, students only",
    template: "%s · CampusConnect",
  },
  description:
    "CampusConnect is a verified, student-only social network — short-form posts, real-time messaging, campus discovery, and the Dope reward system. No outsiders. No noise.",
  applicationName: "CampusConnect",
  keywords: [
    "CampusConnect",
    "student social network",
    "verified students",
    "campus app",
    "university social app",
  ],
  authors: [{ name: "CampusConnect" }],
  openGraph: {
    type: "website",
    title: "CampusConnect — The private campus, students only",
    description:
      "A verified, student-only campus network. Posts, messaging, discovery, and the Dope reward system. No outsiders.",
    siteName: "CampusConnect",
  },
  twitter: {
    card: "summary_large_image",
    title: "CampusConnect — The private campus, students only",
    description:
      "A verified, student-only campus network. No outsiders. No noise.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070A08",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Brand fonts: Plus Jakarta Sans (headings) + Manrope (body).
            Loaded via <link> so the page degrades gracefully to the system
            stack if the network is unavailable during a local preview. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
