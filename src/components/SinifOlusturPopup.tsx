"use client";

import { useState } from "react";
import { db } from "@/config/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface SinifOlusturPopupProps {
  kullaniciUid: string;
  onKapat: () => void;
  onBasari: () => void;
  acik: boolean;
}

export default function SinifOlusturPopup({
  kullaniciUid,
  onKapat,
  onBasari,
  acik,
}: SinifOlusturPopupProps) {
  const [ad, setAd] = useState("");
  const [kod, setKod] = useState("");
  const [bilgi, setBilgi] = useState("");

  if (!acik) return null;

  const sinifOlustur = async () => {
    if (!ad || !kod) return;

    try {
      await addDoc(collection(db, "siniflar"), {
        ad,
        kod,
        ogretmenUid: kullaniciUid,
        uyeler: [kullaniciUid],
        olusturmaTarihi: serverTimestamp(),
      });

      setAd("");
      setKod("");
      setBilgi("✅ Sınıf başarıyla oluşturuldu.");
      onBasari();
      onKapat();
    } catch (error) {
      console.error("Sınıf oluşturma hatası:", error);
      setBilgi("❌ Hata oluştu.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-96">
        <h2 className="text-xl font-bold mb-4">Yeni Sınıf Oluştur</h2>
        <input
          type="text"
          placeholder="Sınıf adı"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-2"
        />
        <input
          type="text"
          placeholder="Sınıf kodu (benzersiz)"
          value={kod}
          onChange={(e) => setKod(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onKapat}
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
          >
            İptal
          </button>
          <button
            onClick={sinifOlustur}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Oluştur
          </button>
        </div>
        {bilgi && <p className="text-sm mt-2">{bilgi}</p>}
      </div>
    </div>
  );
}