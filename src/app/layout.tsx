import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jira to Xero Bills Converter",
  description: "Convert Jira Service Desk payment CSV to Xero Bills import format",
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
