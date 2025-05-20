"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Logo() {
  const router = useRouter();

  return (
    <div className="cursor-pointer" onClick={() => router.push("/siniflar")}>
      <Image
  src="/logo.PNG"
  alt="DropNotes Logo"
  width={40}   // küçültüldü
  height={40}
  priority
/>
    </div>
  );
}
