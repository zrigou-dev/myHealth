import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "MyHeart - Premium Healthcare Services",
  description: "Advanced healthcare management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} suppressHydrationWarning>
        <Toaster position="top-right" />
        <Navbar />
        <main style={{ flex: 1, paddingTop: '120px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
