import type { Metadata } from "next";
import Link from "next/link";
import { FlashProvider } from "@/components/flash";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Manager",
  description: "A simple task manager built with Next.js 15 and tRPC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>
          <FlashProvider>
            <header className="site-header">
              <div className="container">
                <Link href="/" className="brand">
                  Task Manager
                </Link>
              </div>
            </header>
            <main className="container">{children}</main>
          </FlashProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
