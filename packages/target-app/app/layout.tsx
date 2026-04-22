import type { Metadata } from "next";
import "./globals.css";
import { OverlayLoader } from "@live-dev/next";

export const metadata: Metadata = {
  title: "Live-Dev target app",
  description: "Sample app used as a testbed for the Live-Dev overlay",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <OverlayLoader />
      </body>
    </html>
  );
}
