import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

const mailUser = functions.config().mail.user;
const mailPass = functions.config().mail.pass;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: mailUser,
    pass: mailPass,
  },
});

export const icerikEklendigindeMailAt = functions.firestore
  .document("siniflar/{sinifId}/icerikler/{icerikId}")
  .onCreate(async (snap, context) => {
    const sinifId = context.params.sinifId;
    const icerik = snap.data();

    const sinifSnap = await db.collection("siniflar").doc(sinifId).get();
    const sinifData = sinifSnap.data();
    const uyeler = sinifData?.uyeler || [];

    const kullaniciQuery = await db
      .collection("kullanicilar")
      .where("uid", "in", uyeler)
      .get();

    const epostalar = kullaniciQuery.docs.map((d) => d.data().eposta).filter(Boolean);

    const url = `https://dropnotes-app.web.app/siniflar/${sinifId}`;

    await transporter.sendMail({
      from: `"Dropnotes" <${mailUser}>`,
      to: epostalar,
      subject: `📢 ${sinifData?.ad || "Bir sınıf"}: Yeni içerik`,
      text: `${icerik.yukleyenAd || "Bir kullanıcı"} yeni bir içerik paylaştı.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 16px;">
          <h2>📢 Yeni İçerik Paylaşıldı</h2>
          <p><strong>${icerik.yukleyenAd || "Bir kullanıcı"}</strong> yeni bir paylaşım yaptı:</p>
          <blockquote style="color: #555; margin: 10px 0;">
            ${icerik.mesaj ? icerik.mesaj : "Bir dosya ekledi."}
          </blockquote>
          <a href="${url}" style="display:inline-block; margin-top: 14px; padding: 10px 16px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">
            🔗 İçeriği Görüntüle
          </a>
        </div>
      `,
    });
  });

export const yorumEklendigindeMailAt = functions.firestore
  .document("siniflar/{sinifId}/icerikler/{icerikId}/yorumlar/{yorumId}")
  .onCreate(async (snap, context) => {
    const sinifId = context.params.sinifId;
    const icerikId = context.params.icerikId;
    const yorum = snap.data();

    const icerikSnap = await db
      .collection("siniflar")
      .doc(sinifId)
      .collection("icerikler")
      .doc(icerikId)
      .get();

    const icerik = icerikSnap.data();
    if (!icerik || !icerik.yukleyenUID || icerik.yukleyenUID === yorum.yazanUID) return;

    const kullaniciSnap = await db.collection("kullanicilar").doc(icerik.yukleyenUID).get();
    const eposta = kullaniciSnap.data()?.eposta;
    if (!eposta) return;

    const url = `https://dropnotes-app.web.app/siniflar/${sinifId}`;

    await transporter.sendMail({
      from: `"Dropnotes" <${mailUser}>`,
      to: eposta,
      subject: `💬 Paylaşımınıza yorum yapıldı`,
      text: `${yorum.yazanAd || "Bir kullanıcı"} yorum yaptı.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 16px;">
          <h2>💬 Yeni Yorum Geldi</h2>
          <p><strong>${yorum.yazanAd || "Bir kullanıcı"}</strong> paylaşımınıza yorum yaptı:</p>
          <blockquote style="color: #444; margin: 10px 0;">
            "${yorum.metin}"
          </blockquote>
          <a href="${url}" style="display:inline-block; margin-top: 14px; padding: 10px 16px; background-color: #22c55e; color: #fff; text-decoration: none; border-radius: 6px;">
            📄 Yorumu Görüntüle
          </a>
        </div>
      `,
    });
  });
