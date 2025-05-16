"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

export default function RolSec() {
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [rol, setRol] = useState("");
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
    if (!kullaniciId || !rol) return;

    try {
      const ref = doc(db, "kullanicilar", kullaniciId);
      await updateDoc(ref, { rol });

      router.push("/siniflar");
    } catch (error) {
      console.error("Rol seçimi hatası:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Rolünüzü Seçin</h1>
      <select
        value={rol}
        onChange={(e) => setRol(e.target.value)}
        className="p-2 border rounded mb-4"
      >
        <option value="">Seçiniz</option>
        <option value="ogrenci">Öğrenci</option>
        <option value="ogretmen">Öğretmen</option>
      </select>
      <button
        onClick={handleRolSecimi}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Kaydet ve Devam Et
      </button>
    </div>
  );
}