import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gurukul AI — Adaptive AI Teacher & Cognitive Mastery",
  description:
    "An adaptive AI teacher that turns documents and topics into personalized teaching sessions with Google Cloud TTS, amplitude-driven avatar, in-lesson questioning, misconception-aware re-explanation, and assessments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
