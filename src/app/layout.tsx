import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Fraunces } from "next/font/google";
import "./globals.css";
import "./almaprep.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

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
  metadataBase: new URL("https://mock-mate-rosy.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI Mock Interview Practice for College & Engineering | Almaprep",
    description:
      "Practice real-time AI mock interviews for college admissions and engineering roles. Get instant resume analysis and personalized coaching insights. Start free with Almaprep.",
    url: "https://mock-mate-rosy.vercel.app",
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
              "url": "https://mock-mate-rosy.vercel.app",
              "logo": "https://mock-mate-rosy.vercel.app/favicon.png",
              "image": "https://mock-mate-rosy.vercel.app/og-image.png",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
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
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
