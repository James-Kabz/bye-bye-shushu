import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bye-Bye Shushu",
  description: "An interactive family memorial wall for grandmother's memories."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
