import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers"; // Import the wrapper, not the context directly

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
      {/* 
        We pass children to Providers. 
        This allows the Layout to remain a Server Component (for SEO/Metadata)
        while the Providers handle the Client-side logic.
      */}
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}