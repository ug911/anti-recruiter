import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PortalProvider } from "@/components/providers/portal-provider";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anti-Recruiter | Modern Dashboard",
  description: "Advanced recruitment automation and vendor portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground min-h-screen selection:bg-primary/20`}>
        <Providers>
          <ThemeProvider>
            <PortalProvider>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-8">
                  {children}
                </main>
                <footer className="border-t border-border/40 py-8 bg-muted/20">
                  <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    &copy; 2026 Anti-Recruiter. Built for efficiency.
                  </div>
                </footer>
              </div>
            </PortalProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
