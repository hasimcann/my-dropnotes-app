"use client";

import { useState } from "react";
import { db, auth } from "@/config/firebaseConfig";
import {
  addDoc,
  collection,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

interface SinifOlusturPopupProps {
  onClose: () => void;
}

export default function SinifOlusturPopup({ onClose }: SinifOlusturPopupProps) {
  const [sinifAdi, setSinifAdi] = useState("");
  const [mesaj, setMesaj] = useState("");
  const router = useRouter();

  const kodUret = (): string => {
    const harfler = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const rakamlar = "0123456789";
    let kod = "";
    for (let i = 0; i < 3; i++) kod += harfler.charAt(Math.floor(Math.random() * harfler.length));
    for (let i = 0; i < 3; i++) kod += rakamlar.charAt(Math.floor(Math.random() * rakamlar.length));
    return kod;
  };

  const sinifOlustur = async () => {
    const kullanici = auth.currentUser;
    if (!kullanici) return;

    if (!sinifAdi.trim()) {
      setMesaj("❗ Sınıf adı boş olamaz.");
      return;
    }

    try {
      const yeniKod = kodUret();

      // Firestore'a sınıfı ekle ve ID'yi al
      const docRef = await addDoc(collection(db, "siniflar"), {
        ad: sinifAdi,
        kod: yeniKod,
        uyeler: [kullanici.uid],
      });

      // Popup'u kapat ve yönlendir
      onClose();
      router.push(`/siniflar/${docRef.id}`);
    } catch (error) {
      console.error("Sınıf oluşturma hatası:", error);
      setMesaj("❌ Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-center">Yeni Sınıf Oluştur</h2>

        <input
          type="text"
          placeholder="Sınıf adı"
          value={sinifAdi}
          onChange={(e) => setSinifAdi(e.target.value)}
          className="w-full px-4 py-2 border rounded mb-4"
        />

        {mesaj && <p className="text-sm text-center text-red-600 mb-4">{mesaj}</p>}

        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded"
          >
            İptal
          </button>
          <button
            onClick={sinifOlustur}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}
