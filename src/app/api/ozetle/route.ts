import { NextRequest, NextResponse } from "next/server";
import { get } from "https";
import * as pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";

// Yardımcı: PDF, görsel ya da metin dosyasını indir
function dosyaIndir(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      const chunks: any[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

export async function POST(req: NextRequest) {
  try {
    const { url, mimeType } = await req.json();

    if (!url || !mimeType) {
      return NextResponse.json({ error: "Dosya URL veya tipi eksik." }, { status: 400 });
    }

    const dosyaBuffer = await dosyaIndir(url);
    let metin = "";

    if (mimeType === "application/pdf") {
      const parsed = await pdfParse.default(dosyaBuffer);
      metin = parsed.text;
    } else if (mimeType.startsWith("image/")) {
      const { data } = await Tesseract.recognize(dosyaBuffer, "tur"); // Türkçe OCR
      metin = data.text;
    } else if (mimeType.startsWith("text/")) {
      metin = dosyaBuffer.toString("utf-8");
    } else {
      return NextResponse.json({ error: "Desteklenmeyen dosya türü." }, { status: 415 });
    }

    if (!metin || metin.length < 10) {
      return NextResponse.json({ error: "Metin çıkarılamadı veya çok kısa." }, { status: 400 });
    }

    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Aşağıdaki içeriği kısaca ve sade bir şekilde özetle:" },
          { role: "user", content: metin.slice(0, 12000) },
        ],
        temperature: 0.7,
      }),
    });

    const json = await gptRes.json();
    const ozet = json.choices?.[0]?.message?.content || "Özet oluşturulamadı.";

    return NextResponse.json({ ozet });
  } catch (err) {
    console.error("Ozetleme API hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
