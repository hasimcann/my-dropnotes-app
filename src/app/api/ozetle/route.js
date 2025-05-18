import { NextRequest, NextResponse } from "next/server";
import { get } from "https";
import mammoth from "mammoth";
import * as cheerio from "cheerio";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

// URL üzerinden dosya indir
async function dosyaIndir(url) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
  });
}

// PDF içeriğinden görsel tabanlı metin çıkar (OCR yedek)
async function pdfToTextWithOCR(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvasFactory = new pdfjsLib.NodeCanvasFactory();
    const canvasAndContext = canvasFactory.create(
      viewport.width,
      viewport.height
    );
    const renderContext = {
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory,
    };

    await page.render(renderContext).promise;
    const image = canvasAndContext.canvas.toBuffer();

    const result = await Tesseract.recognize(image, "tur");
    fullText += result.data.text + "\n";
  }

  return fullText.trim();
}

export async function POST(req) {
  try {
    const { icerik, url, mimeType } = await req.json();
    let metin = "";

    if (icerik && icerik.length > 10) {
      metin = icerik;
    } else if (url && mimeType) {
      const buffer = await dosyaIndir(url);

      if (mimeType === "application/pdf") {
        const pdfParse = eval("require")("pdf-parse");
        const parsed = await pdfParse(buffer);

        if (parsed.text.trim().length > 10) {
          metin = parsed.text;
        } else {
          metin = await pdfToTextWithOCR(buffer);
        }

      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({ buffer });
        metin = result.value;

      } else if (mimeType.startsWith("text/html")) {
        const html = buffer.toString("utf-8");
        const $ = cheerio.load(html);
        metin = $("body").text();

      } else if (mimeType.startsWith("text/")) {
        metin = buffer.toString("utf-8");

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
    const ozet =
      json.choices?.[0]?.message?.content || "Özet oluşturulamadı.";
    return NextResponse.json({ ozet });
  } catch (err) {
    console.error("Sunucu hatası:", err);
    return NextResponse.json(
      { error: "Sunucu hatası: " + err.message },
      { status: 500 }
    );
  }
}
