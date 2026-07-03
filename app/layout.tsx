import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "UCC Marketing Strategy OS",
  description:
    "A local-first marketing operations system for UCC strategy, campaigns, content, approvals, KPI tracking, compliance, and reporting.",
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
