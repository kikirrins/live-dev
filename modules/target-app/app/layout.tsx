import type { Metadata } from "next";
import "./globals.css";
import { OverlayLoader } from "@livedev/overlay-client";
import { getCurrentUser } from "@/app/lib/session";

export const metadata: Metadata = {
  title: "Live-Dev target app",
  description: "Sample app used as a testbed for the Live-Dev overlay",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = getCurrentUser();
  return (
    <html lang="en">
      <body>
        {children}
        <OverlayLoader userId={user?.id} />
      </body>
    </html>
  );
}
