const nodemailer = require("nodemailer");
const { google } = require("googleapis");
require("dotenv").config();

const createTransporter = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.EMAIL_ID,
    process.env.EMAIL_SECRET,
    "https://developers.google.com/oauthplayground"
  );
  oauth2Client.setCredentials({ refresh_token: process.env.EMAIL_REFRESH });

  const accessToken = await oauth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL_USER,
      clientId: process.env.EMAIL_ID,
      clientSecret: process.env.EMAIL_SECRET,
      refreshToken: process.env.EMAIL_REFRESH,
      accessToken: accessToken.token,
    },
  });
};

const sendMail = async (mailOptions) => {
  const transporter = await createTransporter();
  return transporter.sendMail({ from: process.env.EMAIL_USER, ...mailOptions });
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const sendResetEmail = async (email, token) => {
  const resetLink = `${process.env.FRONTEND_URL}auth/new-password/${token}`;

  try {
    return await sendMail({
      to: email,
      subject: "Restablecer contraseña",
      html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña: <a href="${resetLink}">Restablecer contraseña</a></p><p>Si no solicitaste esto, ignora este mensaje.</p>`,
    });
  } catch (error) {
    console.error("Could not send the password reset email:", error);
  }
};

const sendClaimDecisionEmail = async ({
  email,
  username,
  status,
  pedigreeId,
  pedigreeName,
  adminNote,
}) => {
  const approved = status === "approved";
  const statusLabel = approved ? "Approved" : "Denied";
  const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const pedigreeLink = frontendUrl
    ? `${frontendUrl}/pedigree/view/${pedigreeId}`
    : "";
  const safeUsername = escapeHtml(username || "user");
  const safePedigreeName = escapeHtml(pedigreeName || `#${pedigreeId}`);
  const safeAdminNote = escapeHtml(adminNote);

  return sendMail({
    to: email,
    subject: `[APBT Pedigree] Claim ${statusLabel.toLowerCase()} for pedigree #${pedigreeId}`,
    text: [
      `Hello ${username || "user"},`,
      "",
      `Your claim for pedigree #${pedigreeId} (${pedigreeName || "Unnamed pedigree"}) has been ${statusLabel.toLowerCase()}.`,
      adminNote ? `Administrator note: ${adminNote}` : "",
      pedigreeLink ? `View pedigree: ${pedigreeLink}` : "",
      "",
      "APBT Pedigree",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <p>Hello ${safeUsername},</p>
      <p>Your claim for pedigree <strong>#${pedigreeId} (${safePedigreeName})</strong> has been <strong>${statusLabel.toLowerCase()}</strong>.</p>
      ${safeAdminNote ? `<p><strong>Administrator note:</strong> ${safeAdminNote}</p>` : ""}
      ${pedigreeLink ? `<p><a href="${pedigreeLink}">View pedigree</a></p>` : ""}
      <p>APBT Pedigree</p>`,
  });
};

module.exports = sendResetEmail;
module.exports.sendClaimDecisionEmail = sendClaimDecisionEmail;
