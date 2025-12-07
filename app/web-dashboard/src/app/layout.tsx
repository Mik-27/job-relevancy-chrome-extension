import type { Metadata } from "next";
import { ToastProvider } from "@/context/ToastContext"; 
import "./globals.css";

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
      <body>
        {/* Wrap everything inside the body */}
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}