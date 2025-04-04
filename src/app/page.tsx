"use client";

// Bileşenleri içe aktarıyoruz
import SignIn from "@/components/SignIn";
import DosyaYukle from "@/components/dosyaYukle"; // Dosya yükleme bileşeni
import Katil from "@/components/Katil"; // ✅ Sınıfa katılma bileşeni

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 sm:p-20 bg-gray-50 dark:bg-gray-900">
      
      {/* Uygulama Başlığı */}
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">
        DropNotes Uygulaması
      </h1>

      {/* Google ile Giriş Yap */}
      <SignIn />

      {/* ✅ Sınıfa Katılma Bileşeni */}
      <div className="mt-6 w-full max-w-md">
        <Katil />
      </div>

      {/* Dosya Yükleme Bileşeni */}
      <div className="mt-6 w-full max-w-md">
        <DosyaYukle />
      </div>
    </div>
  );
}
