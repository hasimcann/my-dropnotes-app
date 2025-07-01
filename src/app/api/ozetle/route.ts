import { NextRequest, NextResponse } from "next/server";
import { get } from "https";
import mammoth from "mammoth";
import * as cheerio from "cheerio";

// URL'den dosya indir (HTTPS) -> Buffer olarak döner
async function dosyaIndir(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`Dosya indirilemedi. HTTP status kodu: ${res.statusCode}`));
        return;
      }
      const chunks: Uint8Array[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// Dinamik PDF çözümleme (pdf-parse + gerekirse OCR)
async function pdfParseYap(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    const text = parsed.text?.trim();

    if (!text || text.length < 10) {
      const Tesseract = await import("tesseract.js");
      const { data: { text: ocrText } } = await Tesseract.recognize(buffer, "tur");
      return ocrText.trim();
    }

    return text;
  } catch (err) {
    console.warn("PDF çözümleme hatası:", err);
    return "";
  }
}

// Dinamik OCR fonksiyonu
async function ocrYap(buffer: Buffer): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const { data: { text } } = await Tesseract.recognize(buffer, "tur");
  return text.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { icerik, url, mimeType } = (await req.json()) as {
      icerik?: string;
      url?: string;
      mimeType?: string;
    };

    let metin = "";

    if (icerik && icerik.length > 10) {
      metin = icerik;
    } else if (url && mimeType) {
      let buffer: Buffer;
      try {
        buffer = await dosyaIndir(url);
      } catch (indirmeHatasi) {
        return NextResponse.json(
          {
            error:
              "Dosya indirilemedi: " +
              (indirmeHatasi instanceof Error ? indirmeHatasi.message : "Bilinmeyen hata"),
          },
          { status: 400 }
        );
      }

      if (mimeType === "application/pdf") {
        metin = await pdfParseYap(buffer);

        if (!metin || metin.length < 10) {
          return NextResponse.json(
            { error: "PDF okunamadı. Lütfen farklı bir dosya deneyin." },
            { status: 400 }
          );
        }
      } else if (
        mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({ buffer });
        metin = result.value.trim();
      } else if (mimeType.startsWith("text/html")) {
        const html = buffer.toString("utf-8");
        const $ = cheerio.load(html);
        metin = $("body").text().trim();
      } else if (mimeType.startsWith("text/")) {
        metin = buffer.toString("utf-8");
      } else if (mimeType.startsWith("image/")) {
        metin = await ocrYap(buffer);
      } else {
        return NextResponse.json(
          { error: "Desteklenmeyen dosya türü." },
          { status: 415 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "İçerik veya dosya eksik." },
        { status: 400 }
      );
    }

    if (!metin || metin.length < 10) {
      return NextResponse.json(
        { error: "Metin çıkarılamadı veya çok kısa." },
        { status: 400 }
      );
    }

    try {
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
        return NextResponse.json(
          { error: "GPT yanıtı alınamadı: " + hata },
          { status: 500 }
        );
      }

      const json = await gptRes.json();
      const ozet = json.choices?.[0]?.message?.content || "Özet oluşturulamadı.";

      return NextResponse.json({ ozet });
    } catch (err) {
      console.error("Sunucu hatası:", err);
      return NextResponse.json(
        {
          error:
            "Sunucu hatası: " + (err instanceof Error ? err.message : "Bilinmeyen hata"),
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Genel hata:", err);
    return NextResponse.json(
      {
        error:
          "Genel hata: " + (err instanceof Error ? err.message : "Bilinmeyen hata"),
      },
      { status: 500 }
    );
  }
}
