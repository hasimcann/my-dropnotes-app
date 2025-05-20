"use client";

import SignIn from "@/components/SignIn";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [animasyonBasla, setAnimasyonBasla] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimasyonBasla(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[#f3f4f6] flex overflow-hidden">
      {/* === Düşen ve Büyüyen Damla Logo === */}
      <div
        className={`absolute transition-all duration-1000 ease-out ${
          animasyonBasla
            ? "top-1/2 left-[8%] -translate-y-1/2 scale-[2.4]"
            : "top-[-300px] left-[8%] scale-[2]"
        }`}
      >
        <Image
          src="/logo1.png"
          alt="DropNotes Logo"
          width={150}
          height={150}
          className="object-contain"
        />
      </div>

      {/* === Yazılar ve Giriş Butonu === */}
      <div className="w-full flex flex-col justify-center items-center text-center">
        {/* Giriş Butonu */}
        <div className="absolute top-8 right-10">
          <SignIn />
        </div>

        {/* Açıklama */}
        <div className="max-w-xl mt-32">
          <h1 className="text-5xl font-extrabold text-gray-800 leading-tight mb-6">
            DropNotes ile notlarını paylaş.
          </h1>
          <p className="text-lg text-gray-600">
            Ders içeriklerini kolayca yükle, başkalarıyla paylaş ve yapay zekâ
            ile özetle. Hızlı, sade ve etkili bir öğrenme ortamı seni bekliyor.
          </p>
        </div>
      </div>
    </div>
  );
}
