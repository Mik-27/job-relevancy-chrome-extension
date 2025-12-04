import type { Metadata } from "next";
import "./globals.css"; // <--- THIS IMPORT IS CRITICAL

export const metadata: Metadata = {
  title: "Resume Analyzer HQ",
  description: "Manage your job applications and resumes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}