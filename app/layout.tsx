import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { DEFAULT_THEME } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "UCC Marketing Strategy OS",
  description:
    "A local-first marketing operations system for UCC strategy, campaigns, content, approvals, KPI tracking, compliance, and reporting.",
};

// Applies the saved theme before first paint to avoid a flash of the wrong theme.
const themeInitScript = `(function(){try{var t=localStorage.getItem('ucc-os-theme');var allowed=['original-dark','original-light','arcane','kingdom'];document.documentElement.setAttribute('data-theme',allowed.indexOf(t)>-1?t:'${DEFAULT_THEME}');}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
