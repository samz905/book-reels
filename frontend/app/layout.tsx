import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import QueryProvider from "./providers/QueryProvider";

const mulish = Mulish({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-mulish",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://oddega.com"),
  title: {
    default: "Oddega",
    template: "%s | Oddega",
  },
  description: "Create AI-video series from your stories",
  openGraph: {
    title: "Oddega",
    description: "Create AI-video series from your stories",
    siteName: "Oddega",
    images: [{ url: "/logo-black.png", width: 1536, height: 1024, alt: "Oddega" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oddega",
    description: "Create AI-video series from your stories",
    images: ["/logo-black.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${mulish.variable} font-sans antialiased`}>
        <AuthProvider>
          <CartProvider>
            <QueryProvider>{children}</QueryProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
