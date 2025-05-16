"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/config/firebaseConfig";
import {
  doc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

interface KatilPopupProps {
  onClose: () => void;
}

export default function KatilPopup({ onClose }: KatilPopupProps) {
  const [kod, setKod] = useState("");
  const [mesaj, setMesaj] = useState("");
  const router = useRouter();

  const sinifaKatil = async () => {
    const kullanici = auth.currentUser;
    if (!kullanici) return;

    try {
      const sinifQuery = query(
        collection(db, "siniflar"),
        where("kod", "==", kod)
      );
      const snapshot = await getDocs(sinifQuery);

      if (snapshot.empty) {
        setMesaj("❌ Geçersiz sınıf kodu.");
        return;
      }

      const sinifDoc = snapshot.docs[0];
      const sinifRef = doc(db, "siniflar", sinifDoc.id);
      const sinifData = sinifDoc.data();

      if (sinifData.uyeler.includes(kullanici.uid)) {
        setMesaj("ℹ️ Zaten bu sınıfa kayıtlısınız.");
        return;
      }

      await updateDoc(sinifRef, {
        uyeler: arrayUnion(kullanici.uid),
      });

      router.push(`/siniflar/${sinifDoc.id}`);
    } catch (error) {
      console.error("Sınıfa katılma hatası:", error);
      setMesaj("❌ Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-xl font-semibold mb-4 text-center">Sınıf Kodunu Girin</h2>
        <input
          type="text"
          placeholder="Sınıf kodu"
          value={kod}
          onChange={(e) => setKod(e.target.value)}
          className="w-full border rounded px-4 py-2 mb-4"
        />
        {mesaj && <p className="text-sm text-center text-red-600 mb-4">{mesaj}</p>}
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
          >
            İptal
          </button>
          <button
            onClick={sinifaKatil}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
          >
            Katıl
          </button>
        </div>
      </div>
    </div>
  );
}
