import { NextRequest, NextResponse } from "next/server";
import { get } from "https";
import * as pdfParse from "pdf-parse";

async function dosyaIndir(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      const chunks: Uint8Array[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { icerik, url, mimeType } = await req.json();
    let metin = "";

    if (icerik && icerik.length > 10) {
      metin = icerik;
    } else if (url && mimeType) {
      const dosyaBuffer = await dosyaIndir(url);

      if (mimeType === "application/pdf") {
        const parsed = await pdfParse.default(dosyaBuffer);
        console.log("PDF'den elde edilen metin:", parsed.text); // Log ile kontrol
        metin = parsed.text;
      } else if (mimeType.startsWith("text/")) {
        metin = dosyaBuffer.toString("utf-8");
      } else {
        return NextResponse.json({ error: "Desteklenmeyen dosya türü." }, { status: 415 });
      }
    } else {
      return NextResponse.json({ error: "İçerik veya dosya eksik." }, { status: 400 });
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
          { role: "system", content: "Aşağıdaki içeriği kısaca özetle:" },
          { role: "user", content: metin.slice(0, 12000) },
        ],
        temperature: 0.7,
      }),
    });

    const json = await gptRes.json();
    const ozet = json.choices?.[0]?.message?.content || "Özet oluşturulamadı.";
    return NextResponse.json({ ozet });
  } catch (err) {
    console.error("Sunucu hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
