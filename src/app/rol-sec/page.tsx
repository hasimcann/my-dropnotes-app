"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import Header from "@/components/Header";

export default function RolSec() {
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [seciliRol, setSeciliRol] = useState<"ogrenci" | "ogretmen" | "">("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setKullaniciId(user.uid);
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleRolSecimi = async () => {
    if (!kullaniciId || !seciliRol) return;

    try {
      const ref = doc(db, "kullanicilar", kullaniciId);
      await updateDoc(ref, { rol: seciliRol });
      router.push("/siniflar");
    } catch (error) {
      console.error("Rol seçimi hatası:", error);
    }
  };

  return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white px-4">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Rolünüzü Seçin</h1>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setSeciliRol("ogrenci")}
              className={`w-full py-3 rounded-lg font-semibold border-2 ${
                seciliRol === "ogrenci"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              🎓 Öğrenci
            </button>
            <button
              onClick={() => setSeciliRol("ogretmen")}
              className={`w-full py-3 rounded-lg font-semibold border-2 ${
                seciliRol === "ogretmen"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              👨‍🏫 Öğretmen
            </button>
          </div>
          <button
            onClick={handleRolSecimi}
            disabled={!seciliRol}
            className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            Kaydet ve Devam Et
          </button>
        </div>
      </div>
    </>
  );
}
