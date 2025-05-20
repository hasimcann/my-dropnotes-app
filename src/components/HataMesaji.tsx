"use client";
import { useEffect, useState } from "react";

export default function HataMesaji({ mesaj }: { mesaj: string }) {
  const [goster, setGoster] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setGoster(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!goster) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-fadeIn">
      <div className="bg-red-600 text-white px-4 py-2 rounded shadow-lg text-sm max-w-xs w-full">
        {mesaj}
      </div>
    </div>
  );
}
