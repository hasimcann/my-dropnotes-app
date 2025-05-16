"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/config/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

const Katil = () => {
  const [kod, setKod] = useState("");
  const [bilgi, setBilgi] = useState("");
  const [kullanici, setKullanici] = useState<User | null>(null);

  // Giriş yapan kullanıcıyı takip et
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setKullanici(user);
    });
    return () => unsubscribe();
  }, []);

  const handleKatil = async () => {
    if (!kod || !kullanici) return;

    try {
      const sinifQuery = query(
        collection(db, "siniflar"),
        where("kod", "==", kod.trim())
      );
      const querySnapshot = await getDocs(sinifQuery);

      if (querySnapshot.empty) {
        setBilgi("❌ Geçersiz sınıf kodu.");
        return;
      }

      const sinifDoc = querySnapshot.docs[0];
      const sinifRef = doc(db, "siniflar", sinifDoc.id);

      await updateDoc(sinifRef, {
        uyeler: arrayUnion(kullanici.uid),
      });

      setBilgi("✅ Sınıfa başarıyla katıldınız.");
    } catch (error) {
      console.error("Katılma hatası:", error);
      setBilgi("❌ Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded shadow-md max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold text-center">Sınıfa Katıl</h2>
      <input
        type="text"
        placeholder="Sınıf kodunu girin"
        value={kod}
        onChange={(e) => setKod(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />
      <button
        onClick={handleKatil}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Katıl
      </button>
      {bilgi && <p className="text-sm text-center">{bilgi}</p>}
    </div>
  );
};

export default Katil;
