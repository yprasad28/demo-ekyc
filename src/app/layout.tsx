import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureKYC — Digital Identity Verification for Indian Banking",
  description:
    "Complete your KYC digitally in under 3 minutes. Bank-grade encryption, UIDAI compliant Aadhaar verification, PAN verification, and MeitY compliant digital onboarding.",
  keywords: "eKYC, Aadhaar verification, PAN verification, digital KYC, Indian banking, UIDAI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-manrope bg-background text-on-background min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
