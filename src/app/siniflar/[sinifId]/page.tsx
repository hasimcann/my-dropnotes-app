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

/* --------- Tip Tanımları --------- */
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

/* --------- Modal Bileşeni --------- */
function OzetModal({
  acik,
  ozet,
  yukleniyor,
  onKapat,
}: {
  acik: boolean;
  ozet: string;
  yukleniyor: boolean;
  onKapat: () => void;
}) {
  if (!acik) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl max-w-lg w-full animate-fadeIn">
        <h2 className="text-xl font-semibold mb-4 text-center">📄 İçerik Özeti</h2>
        <div className="max-h-64 overflow-y-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200 mb-4">
          {yukleniyor ? "Özetleniyor..." : ozet}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(ozet)}
            disabled={yukleniyor}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-sm rounded disabled:opacity-40"
          >
            Kopyala
          </button>
          <button
            onClick={onKapat}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 text-sm rounded"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SinifDetaySayfasi() {
  const params = useParams();
  const sinifId = params?.sinifId as string;

  /* --------- State’ler --------- */
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [sinifAdi, setSinifAdi] = useState("");
  const [sinifKodu, setSinifKodu] = useState("");
  const [icerikler, setIcerikler] = useState<Icerik[]>([]);
  const [mesaj, setMesaj] = useState("");
  const [dosya, setDosya] = useState<File | null>(null);
  const [dosyaAdi, setDosyaAdi] = useState("");
  const [progress, setProgress] = useState(0);
  const [yorumlar, setYorumlar] = useState<Record<string, Yorum[]>>({});
  const [yeniYorum, setYeniYorum] = useState<Record<string, string>>({});
  const [acikMenu, setAcikMenu] = useState<Record<string, boolean>>({});
  /* Özetleme ile ilgili */
  const [ozetModalAcik, setOzetModalAcik] = useState(false);
  const [ozetYukleniyor, setOzetYukleniyor] = useState(false);
  const [ozetMetni, setOzetMetni] = useState("");

  /* --------- useEffect --------- */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setKullanici(u);
        await getKullaniciRol(u.uid);
        await sinifVerileriniGetir();
        await icerikleriGetir();
      }
    });
    return () => unsubscribe();
  }, []);

  /* --------- Yardımcı Fonksiyonlar --------- */
  const getKullaniciRol = async (uid: string) => {
    const q = query(collection(db, "kullanicilar"), where("uid", "==", uid));
    const snap = await getDocs(q);
    if (!snap.empty) setRol(snap.docs[0].data().rol);
  };

  const sinifVerileriniGetir = async () => {
    const ref = doc(db, "siniflar", sinifId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setSinifAdi(snap.data().ad);
      setSinifKodu(snap.data().kod);
    }
  };

  const icerikleriGetir = async () => {
    const ref = collection(db, "siniflar", sinifId, "icerikler");
    const snap = await getDocs(ref);
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Icerik))
      .sort((a, b) => b.tarih.toMillis() - a.tarih.toMillis()); // en yeni üstte
    setIcerikler(list);
    for (const d of snap.docs) await yorumlariGetir(d.id);
  };

  const yorumlariGetir = async (icerikId: string) => {
    const ref = collection(db, "siniflar", sinifId, "icerikler", icerikId, "yorumlar");
    const snap = await getDocs(ref);
    setYorumlar((p) => ({
      ...p,
      [icerikId]: snap.docs.map((d) => ({ id: d.id, ...d.data() } as Yorum)),
    }));
  };

  const yorumEkle = async (icerikId: string) => {
    if (!kullanici || !yeniYorum[icerikId]) return;
    await addDoc(collection(db, "siniflar", sinifId, "icerikler", icerikId, "yorumlar"), {
      yazanUID: kullanici.uid,
      yazanAd: kullanici.displayName || kullanici.email,
      metin: yeniYorum[icerikId],
      tarih: Timestamp.now(),
    });
    setYeniYorum((p) => ({ ...p, [icerikId]: "" }));
    await yorumlariGetir(icerikId);
  };

  const icerikSil = async (icerik: Icerik) => {
    if (!kullanici) return;
    if (kullanici.uid !== icerik.yukleyenUID && rol !== "ogretmen") return;
    await deleteDoc(doc(db, "siniflar", sinifId, "icerikler", icerik.id));
    await icerikleriGetir();
  };

  const yorumSil = async (icerikId: string, yorum: Yorum) => {
    if (!kullanici) return;
    if (kullanici.uid !== yorum.yazanUID && rol !== "ogretmen") return;
    await deleteDoc(doc(db, "siniflar", sinifId, "icerikler", icerikId, "yorumlar", yorum.id));
    await yorumlariGetir(icerikId);
  };

  /* --------- Özetleme --------- */
  const ozetle = async (icerik: Icerik) => {
  setOzetModalAcik(true);
  setOzetYukleniyor(true);
  setOzetMetni("");

  try {
    const res = await fetch("/api/ozetle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: icerik.dosyaURL,
        mimeType: icerik.dosyaTipi,
      }),
    });

    const data = await res.json();
    setOzetMetni(data.ozet || "Özetleme başarısız.");
  } catch (e) {
    console.error("Özetleme hatası:", e);
    setOzetMetni("Bir hata oluştu.");
  } finally {
    setOzetYukleniyor(false);
  }
};


  /* --------- Dosya Ekle --------- */
  const handleIcerikEkle = async () => {
    if (!kullanici || (!mesaj.trim() && !dosya)) return;
    if (icerikler.some((i) => i.dosyaAdi === dosya?.name && i.yukleyenUID === kullanici.uid)) {
      alert("Bu dosyayı zaten yüklediniz."); return;
    }
    let url = "", tip = "";
    if (dosya) {
      const r = ref(storage, `siniflar/${sinifId}/${uuidv4()}_${dosya.name}`);
      const up = uploadBytesResumable(r, dosya);
      up.on("state_changed", (s) => setProgress((s.bytesTransferred / s.totalBytes) * 100));
      await up; url = await getDownloadURL(r); tip = dosya.type;
    }
    await addDoc(collection(db, "siniflar", sinifId, "icerikler"), {
      mesaj, dosyaURL: url, dosyaAdi, dosyaTipi: tip,
      yukleyenUID: kullanici!.uid,
      yukleyenAd: kullanici!.displayName || kullanici!.email,
      tarih: Timestamp.now(),
    });
    setMesaj(""); setDosya(null); setDosyaAdi(""); setProgress(0);
    await icerikleriGetir();
  };

  /* --------- JSX --------- */
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Başlık */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-700">{sinifAdi}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Sınıf Kodu: <code className="font-mono">{sinifKodu}</code>
          </p>
        </div>

        {/* Dosya & Mesaj Ekle */}
        <div className="bg-white p-6 rounded shadow mb-10">
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
                  const f = e.target.files?.[0] || null;
                  setDosya(f); setDosyaAdi(f?.name || ""); e.target.value = "";
                }}
                className="hidden"
              />
              <label htmlFor="gizliDosya" className="cursor-pointer bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
                Dosya Seç
              </label>
              {dosyaAdi && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Seçilen dosya: {dosyaAdi}</p>
                  <button onClick={() => { setDosya(null); setDosyaAdi(""); }} className="text-red-500 text-sm">
                    Kaldır
                  </button>
                </div>
              )}
            </div>
            <button onClick={handleIcerikEkle} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Ekle
            </button>
          </div>
        </div>

        {/* İçerik Listesi */}
        <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
          {icerikler.map((ic) => (
            <div key={ic.id} className="bg-white p-4 rounded shadow">
              {/* Üst Bilgi */}
              <div className="mb-2 text-sm text-gray-500">
                {ic.yukleyenAd} ‒ {ic.tarih.toDate().toLocaleString()}
              </div>

              {/* Mesaj / Dosya */}
              {ic.mesaj && <p className="mb-2">{ic.mesaj}</p>}
              {ic.dosyaURL && ic.dosyaTipi?.startsWith("image") && (
                <img src={ic.dosyaURL} alt="Dosya" className="mb-2 rounded" />
              )}
              {ic.dosyaURL && ic.dosyaTipi?.startsWith("video") && (
                <video src={ic.dosyaURL} controls className="mb-2 w-full rounded" />
              )}
              {ic.dosyaURL && !ic.dosyaTipi?.startsWith("image") && !ic.dosyaTipi?.startsWith("video") && (
                <a href={ic.dosyaURL} target="_blank" className="text-blue-600 underline">📎 {ic.dosyaAdi}</a>
              )}

              {/* Özetle Butonu */}
              <button onClick={() => ozetle(ic)} className="mt-2 text-sm text-blue-600 underline hover:text-blue-800">
                📄 Özetle
              </button>

              {/* Sil Menüsü */}
              {(kullanici?.uid === ic.yukleyenUID || rol === "ogretmen") && (
                <div className="relative inline-block text-left float-right">
                  <button onClick={() => setAcikMenu((p) => ({ ...p, [ic.id]: !p[ic.id] }))}>⋮</button>
                  {acikMenu[ic.id] && (
                    <div className="absolute right-0 mt-2 w-24 bg-white border rounded shadow-md z-10">
                      <button
                        onClick={() => { if (confirm("Bu içeriği silmek istediğinize emin misiniz?")) icerikSil(ic); }}
                        className="block w-full px-3 py-1 text-left text-red-600 hover:bg-gray-100 text-sm"
                      >
                        Sil
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Yorumlar */}
              <div className="mt-4">
                <h4 className="text-sm font-semibold">Yorumlar:</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  {(yorumlar[ic.id] || []).map((y) => (
                    <div key={y.id} className="flex justify-between items-start">
                      <p><span className="font-medium">{y.yazanAd}:</span> {y.metin}</p>
                      {(kullanici?.uid === y.yazanUID || rol === "ogretmen") && (
                        <button onClick={() => { if (confirm("Bu yorumu silmek istediğinize emin misiniz?")) yorumSil(ic.id, y); }} className="text-xs text-red-500">Sil</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    value={yeniYorum[ic.id] || ""}
                    onChange={(e) => setYeniYorum((p) => ({ ...p, [ic.id]: e.target.value }))}
                    className="flex-grow px-2 py-1 border rounded"
                    placeholder="Yorum ekle..."
                  />
                  <button onClick={() => yorumEkle(ic.id)} className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">
                    Gönder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Özet Modalı */}
      <OzetModal
        acik={ozetModalAcik}
        yukleniyor={ozetYukleniyor}
        ozet={ozetMetni}
        onKapat={() => { setOzetModalAcik(false); setOzetMetni(""); }}
      />
    </div>
  );
}
