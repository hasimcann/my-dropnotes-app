"use client";

import {
  signInWithPopup,
  signOut,
  User,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider, db } from "@/config/firebaseConfig";
import { useEffect, useState, useCallback } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";

const SignIn = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Kullanıcıyı Firestore'a kaydetme fonksiyonu, useCallback ile sarmalandı
  const kullaniciyiFirestoreaKaydet = useCallback(
    async (user: User) => {
      try {
        const userRef = doc(db, "kullanicilar", user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          // Yeni kullanıcı: Firestore'a kaydet ve rol seçimine yönlendir
          await setDoc(userRef, {
            uid: user.uid,
            ad: user.displayName ?? "İsimsiz",
            eposta: user.email ?? "Bilinmiyor",
            foto: user.photoURL ?? "",
            kayitTarihi: new Date().toISOString(),
            rol: "", // Rol henüz belirlenmedi
          });
          console.log("✅ Yeni kullanıcı Firestore'a kaydedildi.");
          router.push("/rol-sec");
        } else {
          const veri = docSnap.data();
          if (!veri.rol) {
            router.push("/rol-sec");
          } else {
            router.push("/siniflar");
          }
        }
      } catch (error) {
        console.error("❌ Firestore kayıt hatası:", error);
      }
    },
    [router]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await kullaniciyiFirestoreaKaydet(currentUser);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [kullaniciyiFirestoreaKaydet]); // bağımlılık olarak fonksiyon eklendi

  const googleIleGirisYap = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const sonuc = await signInWithPopup(auth, googleProvider);
      setUser(sonuc.user);
      await kullaniciyiFirestoreaKaydet(sonuc.user);
    } catch (error) {
      console.error("Google ile giriş hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const cikisYap = async () => {
    try {
      await signOut(auth);
      setUser(null);
      console.log("🚪 Kullanıcı çıkış yaptı.");
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      {user ? (
        <div className="flex flex-col items-center gap-2">
          <p>Merhaba, {user.displayName}</p>
          <Image
            src={user.photoURL ?? "/default-profile.png"}
            alt="Profil Fotoğrafı"
            width={64}
            height={64}
            className="rounded-full"
            priority={true}
          />
          <button
            onClick={cikisYap}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
          >
            Çıkış Yap
          </button>
        </div>
      ) : (
        <button
          onClick={googleIleGirisYap}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? "Giriş yapılıyor..." : "Google ile Giriş Yap"}
        </button>
      )}
    </div>
  );
};

export default SignIn;
