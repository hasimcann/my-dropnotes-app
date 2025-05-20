"use client";

import { usePathname } from "next/navigation";

export default function PaddingWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Giriş sayfası ise padding verme
  const paddingTopClass = pathname === "/" ? "" : "pt-24";

  return <div className={`${paddingTopClass} min-h-screen`}>{children}</div>;
}
