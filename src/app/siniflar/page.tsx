"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/config/firebaseConfig";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import KatilPopup from "@/components/KatilPopup";
import SinifOlusturPopup from "@/components/SinifOlusturPopup";
import Link from "next/link";

// Sınıf tipi
interface Sinif {
  id: string;
  ad: string;
  kod: string;
}

export default function SiniflarSayfasi() {
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [siniflar, setSiniflar] = useState<Sinif[]>([]);
  const [popupAcik, setPopupAcik] = useState(false);
  const [sinifPopup, setSinifPopup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setKullanici(user);
        await siniflariGetir(user.uid);

        const snap = await getDocs(
          query(collection(db, "kullanicilar"), where("uid", "==", user.uid))
        );
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setRol(data.rol || null);
        }
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, []);

  const siniflariGetir = async (uid: string) => {
    try {
      const q = query(
        collection(db, "siniflar"),
        where("uyeler", "array-contains", uid)
      );
      const snapshot = await getDocs(q);
      const liste: Sinif[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Sinif, "id">),
      }));
      setSiniflar(liste);
    } catch (error) {
      console.error("Sınıflar alınamadı:", error);
    }
  };

  const cikisYap = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
      {/* Sağ üst kullanıcı bilgisi */}
      <div className="flex justify-end items-center gap-4 mb-6">
        {kullanici && (
          <>
            <span>{kullanici.displayName}</span>
            <img
              src={kullanici.photoURL ?? ""}
              alt="Profil"
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

      {/* Başlık ve butonlar */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Kayıtlı Olduğunuz Sınıflar</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setPopupAcik(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            + Sınıfa Katıl
          </button>
          {rol === "ogretmen" && (
            <button
              onClick={() => setSinifPopup(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              + Sınıf Oluştur
            </button>
          )}
        </div>
      </div>

      {/* Sınıf Listesi */}
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

      {/* Popup bileşenleri */}
      <KatilPopup
        acik={popupAcik}
        onKapat={() => setPopupAcik(false)}
        onBasari={() => {
          if (kullanici) siniflariGetir(kullanici.uid);
        }}
      />

      {rol === "ogretmen" && kullanici && (
        <SinifOlusturPopup
          kullaniciUid={kullanici.uid}
          acik={sinifPopup}
          onKapat={() => setSinifPopup(false)}
          onBasari={() => siniflariGetir(kullanici.uid)}
        />
      )}
    </div>
  );
}
