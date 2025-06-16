// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/_providers/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner"; 
import { ConvexQueryCacheProvider } from "@/cache/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "R3 chat",
  description: "R3 chat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background w-screen min-h-dvh sm:min-h-screen`}
      >
        <ClerkProvider>
          <ConvexClientProvider>
            <ConvexQueryCacheProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <Toaster position="top-center" richColors />
              {children}
            </ThemeProvider>
            </ConvexQueryCacheProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
