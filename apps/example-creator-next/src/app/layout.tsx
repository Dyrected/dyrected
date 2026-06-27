import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getNavContent, getFooterContent } from "@/lib/dyrected";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "Future You Coaching | Coaching from the Timeline Where Things Worked Out",
  description:
    "Helping Present You Become the Person Future You Keeps Bragging About. Take the disappointment assessment and align your timeline today.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [navContent, footerContent] = await Promise.all([
    getNavContent(),
    getFooterContent(),
  ]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar cmsContent={navContent} />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer cmsContent={footerContent} />
      </body>
    </html>
  );
}
