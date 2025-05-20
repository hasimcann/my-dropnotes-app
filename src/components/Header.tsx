"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/config/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import Image from "next/image";

export default function Header() {
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [menuAcik, setMenuAcik] = useState(false);
  const [headerGoster, setHeaderGoster] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  // 🔐 Giriş sayfasındaysa header'ı gizle
  useEffect(() => {
    if (pathname === "/") {
      setHeaderGoster(false);
    } else {
      setHeaderGoster(true);
    }
  }, [pathname]);

  // Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setKullanici(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setMenuAcik(false);
  }, [pathname]);

  // Eğer header görünmemeli ya da kullanıcı henüz yüklenmemişse:
  if (!headerGoster || !kullanici) return null;

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-[#f3f4f6] shadow-sm border-b">
      {/* Logo - büyük ve yazısız */}
      <div
        className="cursor-pointer"
        onClick={() => router.push("/siniflar")}
      >
        <Image
          src="/logoo.png"
          alt="Logo"
          width={80}
          height={80}
          className="rounded-md"
        />
      </div>

      {/* Kullanıcı menüsü */}
      <div className="relative">
        <button
          onClick={() => setMenuAcik((p) => !p)}
          className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded hover:shadow"
        >
          {kullanici?.photoURL ? (
            <Image
              src={kullanici.photoURL}
              alt="Profil"
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-semibold">
              {kullanici?.displayName?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <span className="font-medium">
            {kullanici?.displayName || "Kullanıcı"}
          </span>
        </button>

        {menuAcik && (
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10 animate-fadeIn">
            <button
              onClick={async () => {
                if (confirm("Rolünüzü değiştirmek istediğinize emin misiniz?")) {
                  const ref = doc(db, "kullanicilar", kullanici.uid);
                  await updateDoc(ref, { rol: "" });
                  router.push("/rol-sec");
                }
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              🔄 Rolü Değiştir
            </button>
            <button
              onClick={async () => {
                await signOut(auth);
                router.push("/");
              }}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              🚪 Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
