"use client";

import {
  signInWithPopup,
  signOut,
  User,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider, db } from "@/config/firebaseConfig";
import { useEffect, useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const SignIn = () => {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await kullaniciyiFirestoreaKaydet(currentUser);
        router.push("/siniflar");
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Kullanıcıyı Firestore'a kaydet (zaten varsa tekrar yazmaz)
  const kullaniciyiFirestoreaKaydet = async (user: User) => {
    try {
      const userRef = doc(db, "kullanicilar", user.uid);
      const docSnap = await getDoc(userRef);
  
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          ad: user.displayName ?? "İsimsiz",
          eposta: user.email ?? "Bilinmiyor",
          foto: user.photoURL ?? "",
          kayitTarihi: new Date().toISOString(),
          rol: "ogrenci", // ⭐ Varsayılan rol atanıyor
        });
        console.log("✅ Kullanıcı Firestore'a kaydedildi.");
      } else {
        console.log("ℹ️ Kullanıcı zaten kayıtlı.");
      }
    } catch (error) {
      console.error("❌ Firestore kayıt hatası:", error);
    }
  };
  
  

  const googleIleGirisYap = async () => {
    try {
      const sonuc = await signInWithPopup(auth, googleProvider);
      setUser(sonuc.user);
      await kullaniciyiFirestoreaKaydet(sonuc.user);
      router.push("/siniflar");
    } catch (error) {
      console.error("Google ile giriş hatası:", error);
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
          <img
            src={user.photoURL ?? ""}
            alt="Profil Fotoğrafı"
            className="w-16 h-16 rounded-full"
          />
          <button
            onClick={cikisYap}
            className="px-4 py-2 bg-red-500 text-white rounded-md"
          >
            Çıkış Yap
          </button>
        </div>
      ) : (
        <button
          onClick={googleIleGirisYap}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Google ile Giriş Yap
        </button>
      )}
    </div>
  );
};

export default SignIn;
