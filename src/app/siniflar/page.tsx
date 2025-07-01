"use client";

import { useEffect, useState, useCallback } from "react";
// import Image from "next/image";
import { auth, db } from "@/config/firebaseConfig";
import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  arrayRemove,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import KatilPopup from "@/components/KatilPopup";
import SinifOlusturPopup from "@/components/SinifOlusturPopup";

interface Sinif {
  id: string;
  ad: string;
  kod: string;
  uyeler: string[];
}

export default function SiniflarSayfasi() {
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [siniflar, setSiniflar] = useState<Sinif[]>([]);
  const [popupAcik, setPopupAcik] = useState(false);
  const [sinifPopup, setSinifPopup] = useState(false);
  const [acikMenu, setAcikMenu] = useState<Record<string, boolean>>({});
  const router = useRouter();

  // Auth durumunu ve sınıf verilerini getiren fonksiyon dışarıda, useEffect bağımlılığı olarak ekliyoruz
  const initApp = useCallback(() => {
    const unsubscribe = onAuthStateChanged(auth, async (kullanici) => {
      if (kullanici) {
        setKullanici(kullanici);

        const q = query(collection(db, "kullanicilar"), where("uid", "==", kullanici.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const veri = querySnapshot.docs[0].data();
          setRol(veri.rol);
        }

        const sinifQuery = query(
          collection(db, "siniflar"),
          where("uyeler", "array-contains", kullanici.uid)
        );
        const sinifSnapshot = await getDocs(sinifQuery);
        const siniflarListesi = sinifSnapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Sinif, "id">;
          return {
            id: doc.id,
            ...data,
          };
        });
        setSiniflar(siniflarListesi);
      } else {
        router.push("/");
      }
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    const unsubscribe = initApp();
    return () => unsubscribe();
  }, [initApp]);

  const siniftanAyril = async (sinifId: string) => {
    if (!kullanici) return;
    const onay = confirm("Bu sınıftan ayrılmak istediğinize emin misiniz?");
    if (!onay) return;
    const sinifRef = doc(db, "siniflar", sinifId);
    await updateDoc(sinifRef, {
      uyeler: arrayRemove(kullanici.uid),
    });
    setSiniflar((prev) => prev.filter((s) => s.id !== sinifId));
  };

  const sinifiSil = async (sinifId: string) => {
    const onay = confirm("Bu sınıfı silmek istediğinize emin misiniz?");
    if (!onay) return;
    await deleteDoc(doc(db, "siniflar", sinifId));
    setSiniflar((prev) => prev.filter((s) => s.id !== sinifId));
  };

  return (
    <div className="p-8 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Sınıflarınız
      </h1>

      {/* Sınıf kartları */}
      {siniflar.length === 0 ? (
        <p className="text-center text-gray-600">Herhangi bir sınıfa kayıtlı değilsiniz.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {siniflar.map((sinif) => (
            <div
              key={sinif.id}
              onClick={() => router.push(`/siniflar/${sinif.id}`)}
              className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-all group"
            >
              {/* Arka Plan Görseli */}
              <div
                className="h-40 bg-cover bg-center"
                style={{ backgroundImage: "url('/arkaplan.png')" }}
              ></div>

              {/* İçerik */}
              <div className="bg-white p-5 relative">
                {/* Menü */}
                <div
                  className="absolute top-3 right-3 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAcikMenu((prev) => ({ ...prev, [sinif.id]: !prev[sinif.id] }));
                  }}
                >
                  <button className="text-lg text-gray-500 hover:text-gray-800 transition">⋮</button>
                  {acikMenu[sinif.id] && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-20">
                      {rol === "ogrenci" && (
                        <button
                          onClick={() => siniftanAyril(sinif.id)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Sınıftan Ayrıl
                        </button>
                      )}
                      {rol === "ogretmen" && (
                        <button
                          onClick={() => sinifiSil(sinif.id)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Sınıfı Sil
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Başlık ve Kod */}
                <h2 className="text-xl font-bold text-blue-700 group-hover:underline pr-8">
                  {sinif.ad}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Kod:{" "}
                  <code className="bg-gray-100 text-gray-800 font-mono text-sm px-2 py-1 rounded-md">
                    {sinif.kod}
                  </code>
                </p>

                {/* Katılımcı Sayısı */}
                <div className="absolute bottom-3 right-5 text-sm text-gray-500">
                  👥 {sinif.uyeler?.length || 0} kişi
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Butonlar */}
      <div className="flex justify-center gap-4 mt-6">
        {rol === "ogrenci" && (
          <button
            onClick={() => setPopupAcik(true)}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
          >
            + Sınıfa Katıl
          </button>
        )}
        {rol === "ogretmen" && (
          <button
            onClick={() => setSinifPopup(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            + Sınıf Oluştur
          </button>
        )}
      </div>

      {/* Popup Bileşenleri */}
      {popupAcik && <KatilPopup onClose={() => setPopupAcik(false)} />}
      {sinifPopup && <SinifOlusturPopup onClose={() => setSinifPopup(false)} />}
    </div>
  );
}
