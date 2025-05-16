"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/config/firebaseConfig";
import {
  onAuthStateChanged,
  User,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function SinifOlusturSayfasi() {
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [ad, setAd] = useState("");
  const [kod, setKod] = useState("");
  const [bilgi, setBilgi] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setKullanici(user);
        const docRef = doc(db, "kullanicilar", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRol(docSnap.data().rol);
        }
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, []);

  const cikisYap = async () => {
    await signOut(auth);
    router.push("/");
  };

  const sinifOlustur = async () => {
    if (!ad || !kod || !kullanici) return;

    try {
      await addDoc(collection(db, "siniflar"), {
        ad,
        kod,
        ogretmenUid: kullanici.uid,
        uyeler: [kullanici.uid],
        olusturmaTarihi: serverTimestamp(),
      });

      setAd("");
      setKod("");
      setBilgi("✅ Sınıf başarıyla oluşturuldu.");
    } catch (error) {
      console.error("Sınıf oluşturma hatası:", error);
      setBilgi("❌ Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  if (rol !== "ogretmen") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">
          Bu sayfaya erişiminiz yok.
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
      <div className="flex justify-end items-center gap-4 mb-6">
        <span>{kullanici?.displayName}</span>
        <img
          src={kullanici?.photoURL ?? ""}
          alt="Profil Foto"
          className="w-8 h-8 rounded-full"
        />
        <button
          onClick={cikisYap}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
        >
          Çıkış Yap
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-6">Yeni Sınıf Oluştur</h1>

      <div className="space-y-4 max-w-md">
        <input
          type="text"
          placeholder="Sınıf adı"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          className="w-full px-4 py-2 border rounded"
        />
        <input
          type="text"
          placeholder="Sınıf kodu (benzersiz)"
          value={kod}
          onChange={(e) => setKod(e.target.value)}
          className="w-full px-4 py-2 border rounded"
        />
        <button
          onClick={sinifOlustur}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Sınıf Oluştur
        </button>

        {bilgi && <p className="text-sm mt-2">{bilgi}</p>}
      </div>
    </div>
  );
}
