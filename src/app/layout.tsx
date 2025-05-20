import type { Metadata } from "next";
import Header from "@/components/Header";
import PaddingWrapper from "@/components/PaddingWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "DropNotes",
  description: "Not paylaşımı ve yapay zekâ ile özetleme uygulaması",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="icon" href="/iconn.png" type="image/png" />
      </head>
      <body className="bg-gray-50 antialiased">
        <Header />
        <PaddingWrapper>{children}</PaddingWrapper>
      </body>
    </html>
  );
}
