"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import HataMesaji from "@/components/HataMesaji";
import Image from "next/image";
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

interface Uye {
  uid: string;
  ad: string;
  foto?: string;
  rol: string;
}

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
      <div className="bg-white dark:bg-gray-900 p-6 shadow-xl max-w-lg w-full animate-fadeIn">
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
  const [ozetModalAcik, setOzetModalAcik] = useState(false);
  const [ozetYukleniyor, setOzetYukleniyor] = useState(false);
  const [ozetMetni, setOzetMetni] = useState("");
  const [hataMesaji, setHataMesaji] = useState("");
  const [aktifSekme, setAktifSekme] = useState<"icerikler" | "kisiler">("icerikler");
  const [uyeler, setUyeler] = useState<Uye[]>([]);
  const [kullaniciBilgileri, setKullaniciBilgileri] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setKullanici(u);
        await getKullaniciRol(u.uid);
        await sinifVerileriniGetir();
        await icerikleriGetir();
        await sinifUyeleriGetir();
      }
    });
    return () => unsubscribe();
  }, []);

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

  const sinifUyeleriGetir = async () => {
    const sinifRef = doc(db, "siniflar", sinifId);
    const sinifSnap = await getDoc(sinifRef);
    if (!sinifSnap.exists()) return;
    const uyeUidList: string[] = sinifSnap.data().uyeler || [];
    if (uyeUidList.length === 0) return;

    const uyeQuery = query(collection(db, "kullanicilar"), where("uid", "in", uyeUidList));
    const uyeSnap = await getDocs(uyeQuery);
    const liste: Uye[] = uyeSnap.docs.map((d) => ({
      uid: d.data().uid,
      ad: d.data().ad || d.data().email,
      foto: d.data().foto,
      rol: d.data().rol,
    }));
    const sirali = [...liste].sort((a, b) => a.rol === "ogretmen" ? -1 : 1);
    setUyeler(sirali);
  };

    const icerikleriGetir = async () => {
    const ref = collection(db, "siniflar", sinifId, "icerikler");
    const snap = await getDocs(ref);
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Icerik))
      .sort((a, b) => b.tarih.toMillis() - a.tarih.toMillis());
    setIcerikler(list);

    for (const d of snap.docs) {
      await yorumlariGetir(d.id);
    }
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

    useEffect(() => {
    const getirKullaniciBilgileri = async () => {
      const yeniVeriler: { [key: string]: any } = {};
      await Promise.all(
        icerikler.map(async (icerik) => {
          const uid = icerik.yukleyenUID;
          if (!uid || kullaniciBilgileri[uid]) return;

          try {
            const ref = doc(db, "kullanicilar", uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              yeniVeriler[uid] = snap.data();
            }
          } catch (e) {
            console.error("Kullanıcı verisi alınırken hata:", e);
          }
        })
      );
      setKullaniciBilgileri((prev) => ({ ...prev, ...yeniVeriler }));
    };

    if (icerikler.length > 0) {
      getirKullaniciBilgileri();
    }
  }, [icerikler]);

  const ozetle = async (icerik: Icerik) => {
    setOzetModalAcik(true);
    setOzetYukleniyor(true);
    setOzetMetni("");

    const body: any = {};
    if (icerik.mesaj) body.icerik = icerik.mesaj;
    else if (icerik.dosyaURL && icerik.dosyaTipi) {
      body.url = icerik.dosyaURL + "&alt=media";
      body.mimeType = icerik.dosyaTipi;
    }

    try {
      const res = await fetch("/api/ozetle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setHataMesaji(data.error || "Özetleme başarısız.");
        setOzetModalAcik(false);
        return;
      }

      const data = await res.json();
      setOzetMetni(data.ozet || "Özet oluşturulamadı.");
    } catch {
      setHataMesaji("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
      setOzetModalAcik(false);
    } finally {
      setOzetYukleniyor(false);
    }
  };

    const handleIcerikEkle = async () => {
    if (!kullanici || (!mesaj.trim() && !dosya)) return;

    // Aynı dosya kullanıcı tarafından zaten yüklendiyse engelle
    if (
      dosya &&
      icerikler.some(
        (i) => i.dosyaAdi === dosya.name && i.yukleyenUID === kullanici.uid
      )
    ) {
      alert("Bu dosyayı zaten yüklediniz.");
      return;
    }

    let url = "", tip = "";
    if (dosya) {
      const r = ref(storage, `siniflar/${sinifId}/${uuidv4()}_${dosya.name}`);
      const up = uploadBytesResumable(r, dosya);
      up.on("state_changed", (s) =>
        setProgress((s.bytesTransferred / s.totalBytes) * 100)
      );
      await up;
      url = await getDownloadURL(r);
      tip = dosya.type;
    }

    await addDoc(collection(db, "siniflar", sinifId, "icerikler"), {
      mesaj,
      dosyaURL: url,
      dosyaAdi: dosya?.name,
      dosyaTipi: tip,
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
    {/* === Başlık Kartı === */}
    <div className="flex justify-center mb-8">
  <div
    className="relative w-full max-w-2xl rounded-2xl shadow-lg overflow-hidden bg-cover bg-center text-white"
    style={{ backgroundImage: "url('/arkaplan.png')" }}
  >
    <div className="bg-black/50 p-8">
      <h1 className="text-4xl font-bold">{sinifAdi}</h1>
      <p className="text-lg mt-1">
        Sınıf Kodu: <code className="font-mono text-white">{sinifKodu}</code>
      </p>
    </div>
  </div>
</div>
    {/* === Sekmeler === */}
    <div className="flex justify-center gap-10 border-b mb-8 text-lg font-medium">
      <button
        onClick={() => setAktifSekme("icerikler")}
        className={`relative pb-2 ${
          aktifSekme === "icerikler"
            ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-600"
            : "text-gray-500 hover:text-blue-500"
        }`}
      >
        İçerikler
      </button>
      <button
        onClick={() => setAktifSekme("kisiler")}
        className={`relative pb-2 ${
          aktifSekme === "kisiler"
            ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-600"
            : "text-gray-500 hover:text-blue-500"
        }`}
      >
        Kişiler
      </button>
    </div>

    {/* === İçerikler Sekmesi === */}
    {aktifSekme === "icerikler" && (
      <>
        {/* Yeni içerik ekleme alanı */}
        <div className="bg-white p-6 rounded shadow mb-10 max-w-4xl mx-auto">
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
                  setDosya(f);
                  setDosyaAdi(f?.name || "");
                  e.target.value = "";
                }}
                className="hidden"
              />
              <label
                htmlFor="gizliDosya"
                className="cursor-pointer bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
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
                    className="text-red-500 text-sm"
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

          {progress > 0 && (
            <div className="w-full bg-gray-200 h-2 rounded">
              <div
                className="bg-blue-600 h-2 rounded"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* İçerik Kartları */}
        <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
          {icerikler.map((ic) => (
            <div key={ic.id} className="bg-white p-6 rounded shadow relative min-h-[300px]">
              {/* Silme Menüsü sağ üstte */}
              {(kullanici?.uid === ic.yukleyenUID || rol === "ogretmen") && (
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() =>
                      setAcikMenu((p) => ({ ...p, [ic.id]: !p[ic.id] }))
                    }
                    className="text-xl"
                  >
                    ⋮
                  </button>
                  {acikMenu[ic.id] && (
                    <div className="absolute right-0 mt-2 w-24 bg-white border rounded shadow-md z-10">
                      <button
                        onClick={() => {
                          if (confirm("Bu içeriği silmek istediğinize emin misiniz?")) {
                            icerikSil(ic);
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

              {/* Profil Fotoğrafı + Ad + Tarih */}
              <div className="flex items-center gap-3 mb-3">
                {kullaniciBilgileri[ic.yukleyenUID]?.foto ? (
                  <Image
                    src={kullaniciBilgileri[ic.yukleyenUID].foto}
                    alt="Profil"
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300" />
                )}
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800">
                    {kullaniciBilgileri[ic.yukleyenUID]?.ad || ic.yukleyenAd || "Kullanıcı"}
                  </span>
                  <span className="text-sm text-gray-500">
                    {ic.tarih.toDate().toLocaleString("tr-TR")}
                  </span>
                </div>
              </div>

              {/* Mesaj veya Dosya */}
          {ic.mesaj && <p className="mb-2">{ic.mesaj}</p>}

                  {ic.dosyaURL && ic.dosyaTipi?.startsWith("image") && (
              <div className="flex justify-center mb-2">
            <img src={ic.dosyaURL} alt="Dosya" className="rounded max-w-full" />
              </div>
              )}

                {ic.dosyaURL && ic.dosyaTipi?.startsWith("video") && (
              <div className="flex justify-center mb-2">
            <video src={ic.dosyaURL} controls className="rounded max-w-full" />
            </div>
            )}

{ic.dosyaURL &&
  !ic.dosyaTipi?.startsWith("image") &&
  !ic.dosyaTipi?.startsWith("video") && (
    <div className="flex justify-center mb-2">
      <a
        href={ic.dosyaURL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        📎 {ic.dosyaAdi}
      </a>
    </div>
)}


              {/* 📄 Özetle Butonu yorumların üstünde */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => ozetle(ic)}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md shadow hover:opacity-90 transition text-sm"
                  >
                    📄 Özetle
                  </button>
                </div>

              {/* Yorumlar Bölümü */}
              <div className="mt-4">
                <h4 className="text-sm font-semibold">Yorumlar:</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  {(yorumlar[ic.id] || []).map((y) => (
                    <div key={y.id} className="flex justify-between items-start">
                      <p>
                        <span className="font-medium">{y.yazanAd}:</span> {y.metin}
                      </p>
                      {(kullanici?.uid === y.yazanUID || rol === "ogretmen") && (
                        <button
                          onClick={() => {
                            if (confirm("Bu yorumu silmek istediğinize emin misiniz?"))
                              yorumSil(ic.id, y);
                          }}
                          className="text-xs text-red-500"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    value={yeniYorum[ic.id] || ""}
                    onChange={(e) =>
                      setYeniYorum((p) => ({ ...p, [ic.id]: e.target.value }))
                    }
                    className="flex-grow px-2 py-1 border rounded"
                    placeholder="Yorum ekle..."
                  />
                  <button
                    onClick={() => yorumEkle(ic.id)}
                    className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  >
                    Gönder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    )}

    {/* === Kişiler Sekmesi === */}
    {aktifSekme === "kisiler" && (
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Kişiler</h2>
        <div>
          {uyeler.map((u) => (
            <div key={u.uid} className="flex items-center gap-4 mb-3">
              {u.foto ? (
                <Image
                  src={u.foto}
                  alt="Profil"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-400 text-white flex items-center justify-center rounded-full">
                  {u.ad[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div className="flex-1">
                <span className="font-medium">{u.ad}</span>
                {u.rol === "ogretmen" && (
                  <span className="ml-2 text-sm text-blue-600">(Öğretmen)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* === Özet Modalı === */}
    <OzetModal
      acik={ozetModalAcik}
      yukleniyor={ozetYukleniyor}
      ozet={ozetMetni}
      onKapat={() => {
        setOzetModalAcik(false);
        setOzetMetni("");
      }}
    />

    {/* === Hata Mesajı === */}
    {hataMesaji && <HataMesaji mesaj={hataMesaji} />}
  </div>
);
}
