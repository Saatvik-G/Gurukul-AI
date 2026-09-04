import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gurukul AI — Chalkboard Classroom & Adaptive AI Teacher",
  description:
    "A digital gurukul chalkboard classroom with adaptive cognition, Feynman mode explanations, cross-session memory, and amplitude-driven speech.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:ital@0;1&family=Work+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#22362B] text-[#F3EFE3] antialiased selection:bg-[#E3A23B] selection:text-[#2A2A26]">
        {children}
      </body>
    </html>
  );
}
