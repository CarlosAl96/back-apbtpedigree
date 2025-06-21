const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
require("dotenv").config();

const accountTransport = {
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.EMAIL_ID,
    clientSecret: process.env.EMAIL_SECRET,
    refreshToken: process.env.EMAIL_REFRESH,
    accessToken: "",
  },
};

const mail_rover = async (callback) => {
  const oauth2Client = new OAuth2(
    accountTransport.auth.clientId,
    accountTransport.auth.clientSecret,
    "https://developers.google.com/oauthplayground"
  );
  oauth2Client.setCredentials({
    refresh_token: accountTransport.auth.refreshToken,
    tls: {
      rejectUnauthorized: false,
    },
  });
  oauth2Client.getAccessToken((err, token) => {
    if (err) return console.log(err);
    accountTransport.auth.accessToken = token;
    console.log(token);

    callback(nodemailer.createTransport(accountTransport));
  });
};

const sendResetEmail = async (email, token) => {
  const resetLink = `${process.env.FRONTEND_URL}auth/new-password/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Restablecer contraseña",
    html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña: <a href="${resetLink}">Restablecer contraseña</a></p><p>Si no solicitaste esto, ignora este mensaje.</p>`,
  };

  try {
    await mail_rover((transporter) => {
      transporter.sendMail(mailOptions);
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendResetEmail;
