import { NextRequest, NextResponse } from "next/server";
import { get } from "https";
import mammoth from "mammoth";
import * as cheerio from "cheerio";
import Tesseract from "tesseract.js";

// PDF'ler için pdf-parse dinamik olarak yüklenir
async function pdfParseYap(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = eval("require")("pdf-parse");
    const parsed = await pdfParse(buffer);
    const text = parsed.text?.trim();

    // Eğer metin yoksa veya yetersizse OCR kullan
    if (!text || text.length < 10) {
      console.warn("pdf-parse başarısız. OCR denenecek...");
      const { data: { text: ocrText } } = await Tesseract.recognize(buffer, "tur");
      return ocrText.trim();
    }

    return text;
  } catch (err) {
    console.warn("PDF çözümleme başarısız:", err);
    return "";
  }
}

// URL'den dosya indir
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

// === Ana Özetleme Endpoint'i ===
export async function POST(req: NextRequest) {
  try {
    const { icerik, url, mimeType } = await req.json();
    let metin = "";

    // Sadece metin varsa doğrudan kullan
    if (icerik && icerik.length > 10) {
      metin = icerik;
    }
    // Dosya varsa tipi kontrol edilir
    else if (url && mimeType) {
      const buffer = await dosyaIndir(url);

      if (mimeType === "application/pdf") {
        metin = await pdfParseYap(buffer);

        if (!metin || metin.length < 10) {
          return NextResponse.json(
            { error: "PDF okunamadı. Lütfen farklı bir dosya deneyin." },
            { status: 400 }
          );
        }
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({ buffer });
        metin = result.value;
      } else if (mimeType.startsWith("text/html")) {
        const html = buffer.toString("utf-8");
        const $ = cheerio.load(html);
        metin = $("body").text().trim();
      } else if (mimeType.startsWith("text/")) {
        metin = buffer.toString("utf-8");
      } else if (mimeType.startsWith("image/")) {
        const { data: { text } } = await Tesseract.recognize(buffer, "tur");
        metin = text.trim();
      } else {
        return NextResponse.json({ error: "Desteklenmeyen dosya türü." }, { status: 415 });
      }
    } else {
      return NextResponse.json({ error: "İçerik veya dosya eksik." }, { status: 400 });
    }

    if (!metin || metin.length < 10) {
      return NextResponse.json({ error: "Metin çıkarılamadı veya çok kısa." }, { status: 400 });
    }

    // === GPT'ye Özetleme İsteği ===
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Aşağıdaki içeriği açıklayıcı ve detaylı şekilde özetle. Konunun kapsamını, ana fikirleri ve önemli detayları açıkla. Gerekirse paragraflarla veya madde madde ifade et.",
          },
          {
            role: "user",
            content: metin.slice(0, 12000),
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!gptRes.ok) {
      const hata = await gptRes.text();
      return NextResponse.json({ error: "GPT yanıtı alınamadı: " + hata }, { status: 500 });
    }

    const json = await gptRes.json();
    const ozet = json.choices?.[0]?.message?.content || "Özet oluşturulamadı.";
    return NextResponse.json({ ozet });
  } catch (err: any) {
    console.error("Sunucu hatası:", err);
    return NextResponse.json(
      { error: "Sunucu hatası: " + (err.message || "Bilinmeyen hata.") },
      { status: 500 }
    );
  }
}
