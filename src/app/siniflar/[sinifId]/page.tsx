"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db, storage, auth } from "@/config/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

// Dosya tipi tanımı
interface YuklenenDosya {
  dosyaAdi: string;
  url: string;
  yukleyenUid: string;
  sinifId: string;
  yuklemeTarihi?: Timestamp; // tarih formatı daha sonra özelleştirilebilir
}

export default function SinifDetaySayfasi() {
  const params = useParams();
  const sinifId = params.sinifId as string;

  const [dosyalar, setDosyalar] = useState<YuklenenDosya[]>([]);
  const [dosya, setDosya] = useState<File | null>(null);
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [sinifAdi, setSinifAdi] = useState<string>("");

  // Kullanıcı oturumunu takip et
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setKullaniciId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Sınıf bilgisi ve dosyaları getir
  useEffect(() => {
    if (!sinifId) return;

    const dosyalariGetir = async () => {
      const q = query(
        collection(db, "dosyalar"),
        where("sinifId", "==", sinifId)
      );
      const snapshot = await getDocs(q);
      const data: YuklenenDosya[] = snapshot.docs.map((doc) => doc.data() as YuklenenDosya);
      setDosyalar(data);
    };

    const sinifAdiGetir = async () => {
      const q = query(
        collection(db, "siniflar"),
        where("__name__", "==", sinifId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setSinifAdi(snapshot.docs[0].data().ad);
      }
    };

    dosyalariGetir();
    sinifAdiGetir();
  }, [sinifId]);

  // Dosya yükleme işlemi
  const handleUpload = async () => {
    if (!dosya || !kullaniciId || !sinifId) return;

    try {
      const dosyaRef = ref(storage, `dosyalar/${dosya.name}`);
      await uploadBytes(dosyaRef, dosya);
      const url = await getDownloadURL(dosyaRef);

      await addDoc(collection(db, "dosyalar"), {
        dosyaAdi: dosya.name,
        url,
        yukleyenUid: kullaniciId,
        sinifId,
        yuklemeTarihi: serverTimestamp(),
      });

      setDosya(null);
      alert("✅ Dosya yüklendi.");
    } catch (error) {
      console.error("❌ Dosya yükleme hatası:", error);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
      <h1 className="text-2xl font-bold mb-6">
        {sinifAdi ? `${sinifAdi} Sınıfı` : "Yükleniyor..."}
      </h1>

      <div className="flex items-center gap-4 mb-8">
        <input
          type="file"
          onChange={(e) => setDosya(e.target.files?.[0] || null)}
          className="text-sm"
        />
        <button
          onClick={handleUpload}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Yükle
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Sınıfa Ait Yüklenen Dosyalar</h2>
        {dosyalar.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz dosya yüklenmemiş.</p>
        ) : (
          <ul className="space-y-2">
            {dosyalar.map((dosya, index) => (
              <li key={index}>
                <a
                  href={dosya.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {dosya.dosyaAdi}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
