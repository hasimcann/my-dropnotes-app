// src/app/page.tsx
"use client";

import SignIn from "@/components/SignIn";
import Image from "next/image";

export default function Home() {
  return (
    <div className="relative w-full min-h-screen bg-[#f3f4f6] flex overflow-hidden">
      {/* Sol kısım: Logo */}
      <div className="w-1/3 flex items-center justify-center p-8">
        <Image
          src="/logoo.png"
          alt="DropNotes Logo"
          width={220}
          height={220}
          className="object-contain"
        />
      </div>

      {/* Sağ kısım: Açıklama + Giriş */}
      <div className="w-2/3 relative flex flex-col justify-center items-start px-10">
        {/* Giriş Butonu sağ üstte */}
        <div className="absolute top-8 right-10 z-10">
          <SignIn />
        </div>

        {/* Açıklama Ortada */}
        <div className="max-w-xl mt-32">
          <h1 className="text-5xl font-extrabold text-gray-800 leading-tight mb-6">
            DropNotes ile notlarını paylaş.
          </h1>
          <p className="text-lg text-gray-600">
            Ders içeriklerini kolayca yükle, başkalarıyla paylaş ve yapay zekâ ile özetle.
            Hızlı, sade ve etkili bir öğrenme ortamı seni bekliyor.
          </p>
        </div>
      </div>
    </div>
  );
}
