"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/config/firebaseConfig";
import {
  signOut,
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
  uyeler: string[]; // Sınıfın üyeleri
}

export default function SiniflarSayfasi() {
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [siniflar, setSiniflar] = useState<Sinif[]>([]);
  const [popupAcik, setPopupAcik] = useState(false);
  const [sinifPopup, setSinifPopup] = useState(false);
  const [acikMenu, setAcikMenu] = useState<Record<string, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (kullanici) => {
      if (kullanici) {
        setKullanici(kullanici);

        // Rolü çek
        const q = query(collection(db, "kullanicilar"), where("uid", "==", kullanici.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const veri = querySnapshot.docs[0].data();
          setRol(veri.rol);
        }

        // Kullanıcının sınıflarını çek
        const sinifQuery = query(collection(db, "siniflar"), where("uyeler", "array-contains", kullanici.uid));
        const sinifSnapshot = await getDocs(sinifQuery);
        const siniflarListesi = sinifSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Sinif),
        }));
        setSiniflar(siniflarListesi);
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
    <div className="p-8 relative min-h-screen bg-gray-100">
      {/* Sağ Üst Kullanıcı Menüsü */}
      <div className="absolute top-4 right-6 flex items-center space-x-4">
        {kullanici?.photoURL && (
          <img
            src={kullanici.photoURL}
            alt="Profil"
            className="w-10 h-10 rounded-full border"
          />
        )}
        <span className="font-medium">{kullanici?.displayName || "Kullanıcı"}</span>
        <button
          onClick={cikisYap}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Çıkış Yap
        </button>
      </div>

      {/* Ana İçerik */}
      <div className="flex flex-col items-center justify-center h-full pt-20">
        <h1 className="text-2xl font-bold mb-6">Kayıtlı Olduğunuz Sınıflar</h1>

        {siniflar.length === 0 ? (
          <p className="mb-8 text-gray-600">Herhangi bir sınıfa kayıtlı değilsiniz.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl mb-10">
            {siniflar.map((sinif) => (
              <div
                key={sinif.id}
                className="relative cursor-pointer bg-white border hover:shadow-lg hover:bg-blue-50 transition-all duration-300 p-6 rounded-xl"
              >
                {/* Üç Nokta Menü */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() =>
                      setAcikMenu((prev) => ({
                        ...prev,
                        [sinif.id]: !prev[sinif.id],
                      }))
                    }
                  >
                    ⋮
                  </button>
                  {acikMenu[sinif.id] && (
                    <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-md z-10">
                      {rol === "ogrenci" && (
                        <button
                          onClick={() => siniftanAyril(sinif.id)}
                          className="block w-full px-3 py-1 text-left text-red-600 hover:bg-gray-100 text-sm"
                        >
                          Sınıftan Ayrıl
                        </button>
                      )}
                      {rol === "ogretmen" && (
                        <button
                          onClick={() => sinifiSil(sinif.id)}
                          className="block w-full px-3 py-1 text-left text-red-600 hover:bg-gray-100 text-sm"
                        >
                          Sınıfı Sil
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div onClick={() => router.push(`/siniflar/${sinif.id}`)}>
                  <h2 className="text-lg font-semibold text-blue-700">{sinif.ad}</h2>
                  <p className="text-sm mt-2 text-gray-600">
                    Kod: <code className="font-mono">{sinif.kod}</code>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ortadaki Rol Bazlı Butonlar */}
        <div className="flex flex-col items-center space-y-4">
          {rol === "ogrenci" && (
            <button
              onClick={() => setPopupAcik(true)}
              className="bg-green-600 text-white px-6 py-2 rounded"
            >
              + Sınıfa Katıl
            </button>
          )}

          {rol === "ogretmen" && (
            <button
              onClick={() => setSinifPopup(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded"
            >
              + Sınıf Oluştur
            </button>
          )}
        </div>
      </div>

      {/* Popup Bileşenleri */}
      {popupAcik && <KatilPopup onClose={() => setPopupAcik(false)} />}
      {sinifPopup && <SinifOlusturPopup onClose={() => setSinifPopup(false)} />}
    </div>
  );
}
