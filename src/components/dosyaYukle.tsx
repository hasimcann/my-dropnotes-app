"use client";

// Gerekli React ve Firebase bileşenlerini içe aktarıyoruz
import { useState, useEffect } from "react";
import { storage, db, auth } from "@/config/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const DosyaYukle = () => {
  const [dosya, setDosya] = useState<File | null>(null);              // Seçilen dosya
  const [yukleniyor, setYukleniyor] = useState(false);                // Yükleme durumu
  const [url, setUrl] = useState<string | null>(null);                // Dosya bağlantısı
  const [kullanici, setKullanici] = useState<User | null>(null);      // Giriş yapan kullanıcı bilgisi

  // Oturum açık kullanıcıyı takip et (sayfa yenilense bile hatırlansın)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setKullanici(user);
    });
    return () => unsubscribe(); // temizlik
  }, []);

  // Dosya seçildiğinde çağrılır
  const handleDosyaSec = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDosya(e.target.files[0]);
    }
  };

  // Dosyayı Firebase Storage'a yükle ve Firestore'a kaydet
  const handleYukle = async () => {
    if (!dosya || !kullanici) return;

    setYukleniyor(true);
    const storageRef = ref(storage, `dosyalar/${dosya.name}`); // dosyalar klasörüne kaydeder

    try {
      // 📤 Storage'a dosya yükle
      await uploadBytes(storageRef, dosya);

      // 🔗 Yüklenen dosyanın bağlantısını al
      const downloadURL = await getDownloadURL(storageRef);
      setUrl(downloadURL);

      // 🧾 Firestore'a dosya bilgilerini kaydet
      await addDoc(collection(db, "dosyalar"), {
        dosyaAdi: dosya.name,
        url: downloadURL,
        yukleyenUid: kullanici.uid,
        yukleyenAd: kullanici.displayName,
        yukleyenEposta: kullanici.email,
        yuklemeTarihi: serverTimestamp(),
      });

      console.log("✅ Dosya başarıyla yüklendi ve Firestore'a kaydedildi");
    } catch (error) {
      console.error("❌ Yükleme sırasında hata:", error);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-md bg-white dark:bg-gray-800 shadow-md">
      <input type="file" onChange={handleDosyaSec} className="text-sm" />

      <button
        onClick={handleYukle}
        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded disabled:opacity-50"
        disabled={yukleniyor}
      >
        {yukleniyor ? "Yükleniyor..." : "Dosyayı Yükle"}
      </button>

      {url && (
        <p className="text-sm text-blue-600 break-all text-center">
          Dosya bağlantısı:{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
            {url}
          </a>
        </p>
      )}
    </div>
  );
};

export default DosyaYukle;
