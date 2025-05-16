"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/config/firebaseConfig";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Katil from "@/components/Katil"; // ✅ Katıl bileşenini ekledik

// Firestore'daki sınıf verileri için tip tanımı
interface Sinif {
  id: string;
  ad: string;
  kod: string;
}

export default function SiniflarSayfasi() {
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [siniflar, setSiniflar] = useState<Sinif[]>([]);
  const router = useRouter();

  // Kullanıcının oturumunu kontrol et ve Firestore'dan sınıfları çek
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setKullanici(user);
        await siniflariGetir(user.uid);
      } else {
        router.push("/"); // Giriş yapılmamışsa ana sayfaya yönlendir
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore'dan kullanıcının kayıtlı olduğu sınıfları getir
  const siniflariGetir = async (uid: string) => {
    try {
      const sinifQuery = query(
        collection(db, "siniflar"),
        where("uyeler", "array-contains", uid)
      );

      const snapshot = await getDocs(sinifQuery);
      const sinifListesi: Sinif[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Sinif, "id">),
      }));

      setSiniflar(sinifListesi);
    } catch (error) {
      console.error("❌ Sınıflar alınırken hata:", error);
    }
  };

  // Çıkış yap ve ana sayfaya dön
  const cikisYap = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
      {/* Sağ üst köşede kullanıcı bilgileri */}
      <div className="flex justify-end items-center gap-4 mb-6">
        {kullanici && (
          <>
            <span>{kullanici.displayName}</span>
            <img
              src={kullanici.photoURL ?? ""}
              alt="Profil Foto"
              className="w-8 h-8 rounded-full"
            />
            <button
              onClick={cikisYap}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
            >
              Çıkış Yap
            </button>
          </>
        )}
      </div>

      {/* Sınıfa Katılma Bileşeni */}
      <div className="mb-8">
        <Katil />
      </div>

      {/* Sınıf listesi */}
      <h1 className="text-3xl font-bold mb-6">Kayıtlı Olduğunuz Sınıflar</h1>

      {siniflar.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Herhangi bir sınıfa kayıtlı değilsiniz.
        </p>
      ) : (
        <ul className="space-y-4">
          {siniflar.map((sinif) => (
            <li key={sinif.id}>
              <Link
                href={`/siniflar/${sinif.id}`}
                className="block p-4 bg-white dark:bg-gray-800 rounded shadow hover:bg-blue-50 dark:hover:bg-blue-900 transition"
              >
                <h2 className="text-xl font-semibold">{sinif.ad}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sınıf Kodu: {sinif.kod}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
