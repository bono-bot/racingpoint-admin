import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import AdminLayout from "@/components/AdminLayout";
import { ToastProvider } from "@/components/Toast";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RacingPoint Admin",
  description: "RacingPoint eSports Admin Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${montserrat.variable} antialiased bg-rp-black font-sans`}
      >
        <ToastProvider>
          <AdminLayout>{children}</AdminLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
