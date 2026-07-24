import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Fraunces } from "next/font/google";
import "./globals.css";
import "./almaprep.css";
// Self-hosted FontAwesome (badge/UI icons). Bundled + served same-origin so the
// webfonts load reliably — the previous CDN <link> loaded the CSS but the fonts
// never auto-triggered, leaving every fa-* icon (all the badges) blank.
import "@fortawesome/fontawesome-free/css/all.min.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import PostHogProvider from "@/components/PostHogProvider";
import FontAwesomeLoader from "@/components/FontAwesomeLoader";
import { SITE_URL } from "@/lib/siteConfig";
import { organizationLd, websiteLd } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-head",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Mock Interview Practice for College & Engineering | Almaprep",
    template: "%s | Almaprep",
  },
  description:
    "Practice real-time AI mock interviews for college admissions and engineering roles. Get instant resume analysis and personalized coaching insights. Start free with Almaprep.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "AI Mock Interview Practice for College & Engineering | Almaprep",
    description:
      "Practice real-time AI mock interviews for college admissions and engineering roles. Get instant resume analysis and personalized coaching insights. Start free with Almaprep.",
    url: SITE_URL,
    siteName: "Almaprep",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Almaprep — AI Mock Interview Practice",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Mock Interview Practice for College & Engineering | Almaprep",
    description:
      "Practice real-time AI mock interviews for college admissions and engineering roles. Get instant resume analysis and personalized coaching insights. Start free with Almaprep.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Almaprep",
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "All",
              "description": "AI mock interview practice, resume analyzer, and admissions coaching platform.",
              "url": SITE_URL,
              "logo": `${SITE_URL}/favicon.png`,
              "image": `${SITE_URL}/og-image.png`,
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd()) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <FontAwesomeLoader />
            <PostHogProvider>
              {children}
            </PostHogProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
