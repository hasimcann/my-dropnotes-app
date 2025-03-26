"use client";

import SignIn from "@/components/SignIn";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 sm:p-20 bg-gray-50 dark:bg-gray-900">
      {/* Uygulama Başlığı */}
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">
        DropNotes Uygulaması
      </h1>

      {/* Google ile Giriş Yap */}
      <SignIn />

      
    </div>
  );
}
