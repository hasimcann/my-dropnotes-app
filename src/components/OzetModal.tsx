"use client";

import { useEffect } from "react";

export default function OzetModal({
  ozet,
  onKapat,
}: {
  ozet: string;
  onKapat: () => void;
}) {
  useEffect(() => {
    const kapat = (e: KeyboardEvent) => {
      if (e.key === "Escape") onKapat();
    };
    window.addEventListener("keydown", kapat);
    return () => window.removeEventListener("keydown", kapat);
  }, [onKapat]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white max-w-lg w-full p-6 rounded shadow-lg relative">
        <h2 className="text-xl font-semibold mb-4">İçerik Özeti</h2>
        <div className="max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm text-gray-800">
          {ozet}
        </div>
        <button
          onClick={onKapat}
          className="absolute top-2 right-2 text-gray-500 hover:text-black text-xl"
        >
          ×
        </button>
      </div>
    </div>
  );
}
