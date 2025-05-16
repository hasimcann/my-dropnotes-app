"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { auth, db, storage } from "@/config/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import { v4 as uuidv4 } from "uuid";

interface Icerik {
  id: string;
  mesaj: string;
  dosyaURL?: string;
  dosyaAdi?: string;
  dosyaTipi?: string;
  yukleyenUID: string;
  yukleyenAd: string;
  tarih: Timestamp;
}

interface Yorum {
  id: string;
  yazanUID: string;
  yazanAd: string;
  metin: string;
  tarih: Timestamp;
}

export default function SinifDetaySayfasi() {
  const params = useParams();
  const sinifId = params?.sinifId as string;

  const [kullanici, setKullanici] = useState<User | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [sinifAdi, setSinifAdi] = useState("");
  const [sinifKodu, setSinifKodu] = useState("");
  const [icerikler, setIcerikler] = useState<Icerik[]>([]);
  const [mesaj, setMesaj] = useState("");
  const [dosya, setDosya] = useState<File | null>(null);
  const [dosyaAdi, setDosyaAdi] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [yorumlar, setYorumlar] = useState<Record<string, Yorum[]>>({});
  const [yeniYorum, setYeniYorum] = useState<Record<string, string>>({});
  const [acikMenu, setAcikMenu] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (kullanici) => {
      if (kullanici) {
        setKullanici(kullanici);
        await getKullaniciRol(kullanici.uid);
        await sinifVerileriniGetir();
        await icerikleriGetir();
      }
    });
    return () => unsubscribe();
  }, []);

  const getKullaniciRol = async (uid: string) => {
    const q = query(collection(db, "kullanicilar"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const veri = querySnapshot.docs[0].data();
      setRol(veri.rol);
    }
  };

  const sinifVerileriniGetir = async () => {
    const sinifRef = doc(db, "siniflar", sinifId);
    const sinifSnap = await getDoc(sinifRef);
    if (sinifSnap.exists()) {
      const veri = sinifSnap.data();
      setSinifAdi(veri.ad);
      setSinifKodu(veri.kod);
    }
  };

  const icerikleriGetir = async () => {
    const icerikRef = collection(db, "siniflar", sinifId, "icerikler");
    const q = query(icerikRef);
    const querySnapshot = await getDocs(q);
    const icerikListesi = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Icerik[];
    setIcerikler(icerikListesi);
    for (const ic of querySnapshot.docs) {
      await yorumlariGetir(ic.id);
    }
  };

  const yorumlariGetir = async (icerikId: string) => {
    const yorumRef = collection(db, "siniflar", sinifId, "icerikler", icerikId, "yorumlar");
    const q = query(yorumRef);
    const snapshot = await getDocs(q);
    const yorumListesi = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Yorum[];
    setYorumlar((prev) => ({ ...prev, [icerikId]: yorumListesi }));
  };

  const yorumEkle = async (icerikId: string) => {
    if (!kullanici || !yeniYorum[icerikId]) return;
    await addDoc(collection(db, "siniflar", sinifId, "icerikler", icerikId, "yorumlar"), {
      yazanUID: kullanici.uid,
      yazanAd: kullanici.displayName || kullanici.email,
      metin: yeniYorum[icerikId],
      tarih: Timestamp.now(),
    });
    setYeniYorum((prev) => ({ ...prev, [icerikId]: "" }));
    await yorumlariGetir(icerikId);
  };

  const icerikSil = async (icerik: Icerik) => {
    if (!kullanici) return;
    const silmeYetkili =
      (rol === "ogretmen" && kullanici.uid === icerik.yukleyenUID) ||
      (rol === "ogrenci" && kullanici.uid === icerik.yukleyenUID);

    if (silmeYetkili) {
      await deleteDoc(doc(db, "siniflar", sinifId, "icerikler", icerik.id));
      await icerikleriGetir();
    }
  };

  const yorumSil = async (icerikId: string, yorum: Yorum) => {
    if (!kullanici) return;
    const yetkili = (kullanici.uid === yorum.yazanUID || rol === "ogretmen");
    if (yetkili) {
      await deleteDoc(doc(db, "siniflar", sinifId, "icerikler", icerikId, "yorumlar", yorum.id));
      await yorumlariGetir(icerikId);
    }
  };

  const handleIcerikEkle = async () => {
    if (!kullanici || (!mesaj.trim() && !dosya)) return;

    const ayniDosyaVar = icerikler.some(
      (ic) => ic.dosyaAdi === dosya?.name && ic.yukleyenUID === kullanici.uid
    );
    if (ayniDosyaVar) {
      alert("Bu dosyayı zaten yüklediniz.");
      return;
    }

    let dosyaURL = "";
    let dosyaTipi = "";

    if (dosya) {
      const dosyaRef = ref(storage, `siniflar/${sinifId}/${uuidv4()}_${dosya.name}`);
      const yukleme = uploadBytesResumable(dosyaRef, dosya);
      yukleme.on("state_changed", (snapshot) => {
        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(prog);
      });
      await yukleme;
      dosyaURL = await getDownloadURL(dosyaRef);
      dosyaTipi = dosya.type;
    }

    await addDoc(collection(db, "siniflar", sinifId, "icerikler"), {
      mesaj,
      dosyaURL,
      dosyaAdi,
      dosyaTipi,
      yukleyenUID: kullanici.uid,
      yukleyenAd: kullanici.displayName || kullanici.email,
      tarih: Timestamp.now(),
    });

    setMesaj("");
    setDosya(null);
    setDosyaAdi("");
    setProgress(0);
    await icerikleriGetir();
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-700">{sinifAdi}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Sınıf Kodu: <code className="font-mono">{sinifKodu}</code>
          </p>
        </div>

        {/* Dosya ve mesaj ekleme alanı */}
        <div className="bg-white p-6 rounded shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Yeni Not veya Dosya Ekle</h2>
          <textarea
            value={mesaj}
            onChange={(e) => setMesaj(e.target.value)}
            placeholder="Mesaj veya açıklama yazın..."
            className="w-full border rounded p-3 mb-4 resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <input
                id="gizliDosya"
                type="file"
                onChange={(e) => {
                  const secilen = e.target.files?.[0] || null;
                  setDosya(secilen);
                  setDosyaAdi(secilen?.name || "");
                  e.target.value = "";
                }}
                className="hidden"
              />
              <label
                htmlFor="gizliDosya"
                className="inline-block cursor-pointer bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Dosya Seç
              </label>
              {dosyaAdi && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Seçilen dosya: {dosyaAdi}</p>
                  <button
                    onClick={() => {
                      setDosya(null);
                      setDosyaAdi("");
                    }}
                    className="text-red-500 hover:underline text-sm"
                  >
                    Kaldır
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleIcerikEkle}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Ekle
            </button>
          </div>
        </div>

        {/* İçerik listesi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {icerikler.map((icerik) => (
            <div key={icerik.id} className="bg-white p-4 rounded shadow">
              <div className="mb-2 text-sm text-gray-500">
                {icerik.yukleyenAd} - {icerik.tarih.toDate().toLocaleString()}
              </div>
              {icerik.mesaj && <p className="mb-2">{icerik.mesaj}</p>}
              {icerik.dosyaURL && icerik.dosyaTipi?.startsWith("image") && (
                <img src={icerik.dosyaURL} alt="Dosya" className="mb-2 rounded" />
              )}
              {icerik.dosyaURL && icerik.dosyaTipi?.startsWith("video") && (
                <video src={icerik.dosyaURL} controls className="mb-2 w-full rounded" />
              )}
              {icerik.dosyaURL && !icerik.dosyaTipi?.startsWith("image") && !icerik.dosyaTipi?.startsWith("video") && (
                <a href={icerik.dosyaURL} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  📎 {icerik.dosyaAdi}
                </a>
              )}
              {(kullanici?.uid === icerik.yukleyenUID || rol === "ogretmen") && (
  <div className="relative inline-block text-left">
    <button onClick={() => setAcikMenu((prev) => ({ ...prev, [icerik.id]: !prev[icerik.id] }))}>
      ⋮
    </button>
    {acikMenu[icerik.id] && (
      <div className="absolute right-0 mt-2 w-24 bg-white border rounded shadow-md z-10">
        <button
          onClick={() => {
            if (confirm("Bu içeriği silmek istediğinize emin misiniz?")) {
              icerikSil(icerik);
            }
          }}
          className="block w-full px-3 py-1 text-left text-red-600 hover:bg-gray-100 text-sm"
        >
          Sil
        </button>
      </div>
    )}
  </div>
)}
              <div className="mt-4">
                <h4 className="text-sm font-semibold">Yorumlar:</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  {(yorumlar[icerik.id] || []).map((yorum) => (
                    <div key={yorum.id} className="flex justify-between items-start">
                      <p>
                        <span className="font-medium">{yorum.yazanAd}:</span> {yorum.metin}
                      </p>
                      {(kullanici?.uid === yorum.yazanUID || rol === "ogretmen") && (
  <div className="relative inline-block text-left">
    <button onClick={() => setAcikMenu((prev) => ({ ...prev, [yorum.id]: !prev[yorum.id] }))}>
      ⋮
    </button>
    {acikMenu[yorum.id] && (
      <div className="absolute right-0 mt-2 w-24 bg-white border rounded shadow-md z-10">
        <button
          onClick={() => {
            if (confirm("Bu yorumu silmek istediğinize emin misiniz?")) {
              yorumSil(icerik.id, yorum);
            }
          }}
          className="block w-full px-3 py-1 text-left text-red-600 hover:bg-gray-100 text-sm"
        >
          Sil
        </button>
      </div>
    )}
  </div>
)}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Yorum ekle..."
                    value={yeniYorum[icerik.id] || ""}
                    onChange={(e) =>
                      setYeniYorum((prev) => ({ ...prev, [icerik.id]: e.target.value }))
                    }
                    className="flex-grow px-2 py-1 border rounded"
                  />
                  <button
                    onClick={() => yorumEkle(icerik.id)}
                    className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  >
                    Gönder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
