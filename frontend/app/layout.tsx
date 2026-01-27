import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

const mulish = Mulish({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-mulish",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Book Reels",
  description: "Create AI-video series from your books",
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
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
